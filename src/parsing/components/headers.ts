import ASTNode from "../ast_node";

class Headers extends ASTNode {
  constructor() {
    super()
  }
  public value(): object {
    return this.firstChild().value() as object || {};
  }
}

export default Headers;