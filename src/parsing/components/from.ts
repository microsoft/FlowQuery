import ASTNode from "../ast_node";

class From extends ASTNode {
  constructor() {
    super()
  }
  public value(): string {
    return this.children[0].value();
  }
}

export default From;