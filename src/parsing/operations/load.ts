import Operation from "./operation";
import CSV from "../components/csv";
import {default as _JSON} from "../components/json";
import Text from "../components/text";
import Function from "../functions/function";
import AssociativeArray from "../data_structures/associative_array";
import Reference from "../expressions/reference";
import Expression from "../expressions/expression";
import Headers from "../components/headers";
import Post from "../components/post";
import Lookup from "../data_structures/lookup";

class Load extends Operation {
  private _value: any = null;
  constructor() {
    super()
  }
  public get type(): _JSON | CSV | Text {
    return this.children[0] as _JSON | CSV | Text;
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
  public async load(): Promise<any> {
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
  public async run(): Promise<void> {
    try {
      await this.load();
    } catch(e) {
      throw new Error(`Failed to load data from ${this.from}. Error: ${e}`);
    }
  }
  public value(): any {
    return this._value;
  }
}

export default Load;