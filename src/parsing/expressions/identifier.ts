import String from "./string";

class Identifier extends String {
    public toString(): string {
        return `Identifier (${this._value})`;
    }
    public value(): any {
        return super.value();
    }
}

export default Identifier;