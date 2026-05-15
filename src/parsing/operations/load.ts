import CSV from "../components/csv";
import From from "../components/from";
import Headers from "../components/headers";
import { default as _JSON } from "../components/json";
import Post from "../components/post";
import Text from "../components/text";
import AssociativeArray from "../data_structures/associative_array";
import Lookup from "../data_structures/lookup";
import Expression from "../expressions/expression";
import Reference from "../expressions/reference";
import AsyncFunction from "../functions/async_function";
import Function from "../functions/function";
import Operation from "./operation";

class Load extends Operation {
    private _value: any = null;

    constructor() {
        super();
    }
    public get type(): _JSON | CSV | Text {
        return this.children[0] as _JSON | CSV | Text;
    }

    /**
     * Gets the From component which contains either a URL expression or an AsyncFunction.
     */
    public get fromComponent(): From {
        return this.children[1] as From;
    }

    /**
     * Checks if the data source is an async function.
     */
    public get isAsyncFunction(): boolean {
        return this.fromComponent.firstChild() instanceof AsyncFunction;
    }

    /**
     * Gets the async function if the source is a function, otherwise null.
     */
    public get asyncFunction(): AsyncFunction | null {
        const child = this.fromComponent.firstChild();
        return child instanceof AsyncFunction ? child : null;
    }

    public get from(): string {
        return this.children[1].value() as string;
    }
    public get headers(): { [key: string]: string } {
        if (this.childCount() > 2 && this.children[2] instanceof Headers) {
            return (this.children[2].value() as { [key: string]: string }) || {};
        }
        return {};
    }
    public get payload(): Function | Reference | Expression | AssociativeArray | Lookup | null {
        let post: Post | null = null;
        if (this.childCount() > 2 && this.children[2] instanceof Post) {
            post = this.children[2] as Post;
        } else if (this.childCount() > 3 && this.children[3] instanceof Post) {
            post = this.children[3] as Post;
        }
        return post !== null
            ? (post.firstChild() as Function | Reference | Expression | AssociativeArray | Lookup)
            : null;
    }
    private method(): "GET" | "POST" {
        if (this.payload === null) {
            return "GET";
        } else {
            return "POST";
        }
    }
    private options(): object {
        const headers = this.headers as { [key: string]: string };
        const payload = this.payload;
        const data = payload?.value();
        if (data !== null && typeof data === "object" && !headers.hasOwnProperty("Content-Type")) {
            headers["Content-Type"] = "application/json";
        }
        return {
            method: this.method(),
            headers: headers,
            ...(payload !== null ? { body: JSON.stringify(payload.value()) } : {}),
        };
    }

    /**
     * Checks if the source is a local file URI (file:// protocol).
     */
    public get isFileUri(): boolean {
        if (this.isAsyncFunction) return false;
        return typeof this.from === "string" && this.from.startsWith("file://");
    }

    /**
     * Loads data from a local file (file:// protocol).
     * Only available in Node.js environments.
     */
    private async loadFromFile(): Promise<void> {
        if (typeof process === "undefined" || !process.versions?.node) {
            throw new Error("Local file loading is not supported in the browser");
        }
        // Dynamic require to prevent webpack from bundling fs
        const fs = eval("require")("fs");
        const filePath = this.from.replace(/^file:\/\//, "");
        const content = fs.readFileSync(filePath, "utf-8");
        let data: any = null;
        if (this.type instanceof _JSON) {
            data = JSON.parse(content);
        } else {
            data = content;
        }
        if (Array.isArray(data)) {
            for (const item of data) {
                this._value = item;
                await this.next?.run();
            }
        } else if (typeof data === "object" && data !== null) {
            this._value = data;
            await this.next?.run();
        } else if (typeof data === "string") {
            this._value = data;
            await this.next?.run();
        }
    }

    /**
     * Loads data from an async function source.
     * Arguments from the query (e.g., myFunc(arg1, arg2)) are passed to generate().
     */
    private async loadFromFunction(): Promise<void> {
        const asyncFunc = this.asyncFunction!;
        const args = asyncFunc.getArguments();
        for await (const item of asyncFunc.generate(...args)) {
            this._value = item;
            await this.next?.run();
        }
    }

    /**
     * Loads data from a URL source (original behavior).
     */
    private async loadFromUrl(): Promise<void> {
        const result = await fetch(this.from, this.options());
        let data: any = null;
        if (this.type instanceof _JSON) {
            data = await result.json();
        } else if (this.type instanceof Text) {
            data = await result.text();
        }
        await this.emit(data);
    }

    /**
     * Emits an already-resolved JSON value (e.g. coming from a LET-binding
     * referenced by `LOAD JSON FROM <name>`).  Arrays expand into one
     * iteration per element; non-array values are emitted once.
     */
    private async loadFromValue(data: any): Promise<void> {
        await this.emit(data);
    }

    /**
     * Drives the downstream pipeline for the given data.  Shared by
     * URL / file / value loading paths.
     */
    private async emit(data: any): Promise<void> {
        if (Array.isArray(data)) {
            for (const item of data) {
                this._value = item;
                await this.next?.run();
            }
        } else if (typeof data === "object" && data !== null) {
            this._value = data;
            await this.next?.run();
        } else if (typeof data === "string") {
            this._value = data;
            await this.next?.run();
        } else if (data !== null && data !== undefined) {
            this._value = data;
            await this.next?.run();
        }
    }

    public async load(): Promise<any> {
        if (this.isAsyncFunction) {
            await this.loadFromFunction();
        } else if (this.isFileUri) {
            await this.loadFromFile();
        } else {
            const source = this.children[1].value();
            if (typeof source === "string") {
                await this.loadFromUrl();
            } else {
                await this.loadFromValue(source);
            }
        }
    }
    public async run(): Promise<void> {
        try {
            await this.load();
        } catch (e) {
            const source = this.isAsyncFunction ? this.asyncFunction?.name : this.from;
            throw new Error(`Failed to load data from ${source}. Error: ${e}`);
        }
    }
    public value(): any {
        return this._value;
    }
}

export default Load;
