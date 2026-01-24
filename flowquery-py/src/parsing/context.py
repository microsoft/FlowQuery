"""Maintains a stack of AST nodes to track parsing context."""

from typing import List, Optional, Type

from .ast_node import ASTNode


class Context:
    """Maintains a stack of AST nodes to track parsing context.
    
    Used during parsing to maintain the current context and check for specific node types
    in the parsing hierarchy, which helps with context-sensitive parsing decisions.
    
    Example:
        context = Context()
        context.push(node)
        has_return = context.contains_type(Return)
    """

    def __init__(self):
        self._nodes: List[ASTNode] = []

    def push(self, node: ASTNode) -> None:
        """Pushes a node onto the context stack.
        
        Args:
            node: The AST node to push
        """
        self._nodes.append(node)

    def pop(self) -> Optional[ASTNode]:
        """Pops the top node from the context stack.
        
        Returns:
            The popped node, or None if the stack is empty
        """
        if len(self._nodes) == 0:
            return None
        return self._nodes.pop()

    def contains_type(self, type_: Type[ASTNode]) -> bool:
        """Checks if the nodes stack contains a node of the specified type.
        
        Args:
            type_: The class of the node type to search for
            
        Returns:
            True if a node of the specified type is found in the stack, False otherwise
        """
        return any(isinstance(v, type_) for v in self._nodes)
