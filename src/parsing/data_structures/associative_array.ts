import ASTNode from "../ast_node";
import KeyValuePair from "./key_value_pair";

class AssociativeArray extends ASTNode {
    public addKeyValue(keyValuePair: KeyValuePair): void {
        this.addChild(keyValuePair);
    }

    public toString(): string {
        return 'AssociativeArray';
    }
    private *_value(): Iterable<Record<PropertyKey, any>> {
        for(const child of this.children) {
            const key_value = child as KeyValuePair;
            yield {
                [key_value.key]: key_value._value
            };
        }
    }
    public value(): Record<string, any> {
        return Object.assign({}, ...this._value());
    }
}

export default AssociativeArray;