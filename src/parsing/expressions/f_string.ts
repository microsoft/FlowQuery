import ASTNode from "../ast_node";
import Expression from "./expression";

class FString extends ASTNode {
    public value(): string {
        const parts: Expression[] = this.getChildren() as Array<Expression>;
        return parts.map((part) => part.value()).join("");
    }
}

export default FString;