import Operation from "./operation";
import CSV from "../components/csv";
import {default as _JSON} from "../components/json";
import Text from "../components/text";
import Function from "../functions/function";
import AsyncFunction from "../functions/async_function";
import AssociativeArray from "../data_structures/associative_array";
import Reference from "../expressions/reference";
import Expression from "../expressions/expression";
import Headers from "../components/headers";
import Post from "../components/post";
import Lookup from "../data_structures/lookup";
import From from "../components/from";

class Load extends Operation {
  private _value: any = null;
  constructor() {
    super()
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
    if(this.childCount() > 2 && this.children[2] instanceof Headers) {
      return this.children[2].value() as { [key: string]: string } || {};
    }
    return {};
  }
  public get payload(): Function | Reference | Expression | AssociativeArray | Lookup | null {
    let post: Post | null = null;
    if(this.childCount() > 2 && this.children[2] instanceof Post) {
      post = this.children[2] as Post;
    } else if(this.childCount() > 3 && this.children[3] instanceof Post) {
      post = this.children[3] as Post;
    }
    return post !== null ? post.firstChild() as Function | Reference | Expression | AssociativeArray | Lookup : null;
  }
  private method(): "GET" | "POST" {
    if(this.payload === null) {
      return "GET";
    } else {
      return "POST";
    }
  }
  private options(): object {
    const headers = this.headers as { [key: string]: string };
    const payload = this.payload;
    const data = payload?.value();
    if(data !== null && typeof data === "object" && !(headers.hasOwnProperty("Content-Type"))) {
      headers["Content-Type"] = "application/json";
    }
    return {
      "method": this.method(),
      "headers": headers,
      ...(payload !== null ? {"body": JSON.stringify(payload.value())} : {})
    };
  }

  /**
   * Loads data from an async function source.
   */
  private async loadFromFunction(): Promise<void> {
    const asyncFunc = this.asyncFunction!;
    for await (const item of asyncFunc.execute()) {
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
    if(this.type instanceof _JSON) {
      data = await result.json();
    } else if(this.type instanceof Text) {
      data = await result.text();
    }
    if(Array.isArray(data)) {
      for(const item of data) {
        this._value = item;
        await this.next?.run();
      }
    } else if(typeof data === "object" && data !== null) {
      this._value = data;
      await this.next?.run();
    } else if(typeof data === "string") {
      this._value = data;
      await this.next?.run();
    }
  }

  public async load(): Promise<any> {
    if (this.isAsyncFunction) {
      await this.loadFromFunction();
    } else {
      await this.loadFromUrl();
    }
  }
  public async run(): Promise<void> {
    try {
      await this.load();
    } catch(e) {
      const source = this.isAsyncFunction ? this.asyncFunction?.name : this.from;
      throw new Error(`Failed to load data from ${source}. Error: ${e}`);
    }
  }
  public value(): any {
    return this._value;
  }
}

export default Load;