"""Represents a formatted string (f-string) in the AST."""

from typing import TYPE_CHECKING

from ..ast_node import ASTNode

if TYPE_CHECKING:
    from .expression import Expression


class FString(ASTNode):
    """Represents a formatted string (f-string) in the AST.
    
    F-strings allow embedding expressions within string literals.
    Child nodes represent the parts of the f-string (literal strings and expressions).
    
    Example:
        # For f"Hello {name}!"
        fstr = FString()
        fstr.add_child(String("Hello "))
        fstr.add_child(name_expression)
        fstr.add_child(String("!"))
    """

    def value(self) -> str:
        parts = self.get_children()
        return "".join(str(part.value()) for part in parts)
