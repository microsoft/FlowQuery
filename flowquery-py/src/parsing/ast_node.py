"""Represents a node in the Abstract Syntax Tree (AST)."""

from __future__ import annotations
from typing import List, Any, Generator, Optional


class ASTNode:
    """Represents a node in the Abstract Syntax Tree (AST).
    
    The AST is a tree representation of the parsed FlowQuery statement structure.
    Each node can have children and maintains a reference to its parent.
    
    Example:
        root = ASTNode()
        child = ASTNode()
        root.add_child(child)
    """

    def __init__(self):
        self._parent: Optional[ASTNode] = None
        self.children: List[ASTNode] = []

    def add_child(self, child: ASTNode) -> None:
        """Adds a child node to this node and sets the child's parent reference.
        
        Args:
            child: The child node to add
        """
        child._parent = self
        self.children.append(child)

    def first_child(self) -> ASTNode:
        """Returns the first child node.
        
        Returns:
            The first child node
            
        Raises:
            ValueError: If the node has no children
        """
        if len(self.children) == 0:
            raise ValueError('Expected child')
        return self.children[0]

    def last_child(self) -> ASTNode:
        """Returns the last child node.
        
        Returns:
            The last child node
            
        Raises:
            ValueError: If the node has no children
        """
        if len(self.children) == 0:
            raise ValueError('Expected child')
        return self.children[-1]

    def get_children(self) -> List[ASTNode]:
        """Returns all child nodes.
        
        Returns:
            Array of child nodes
        """
        return self.children

    def child_count(self) -> int:
        """Returns the number of child nodes.
        
        Returns:
            The count of children
        """
        return len(self.children)

    def value(self) -> Any:
        """Returns the value of this node. Override in subclasses to provide specific values.
        
        Returns:
            The node's value, or None if not applicable
        """
        return None

    def is_operator(self) -> bool:
        """Checks if this node represents an operator.
        
        Returns:
            True if this is an operator node, False otherwise
        """
        return False

    def is_operand(self) -> bool:
        """Checks if this node represents an operand (the opposite of an operator).
        
        Returns:
            True if this is an operand node, False otherwise
        """
        return not self.is_operator()

    @property
    def precedence(self) -> int:
        """Gets the operator precedence for this node. Higher values indicate higher precedence.
        
        Returns:
            The precedence value (0 for non-operators)
        """
        return 0

    @property
    def left_associative(self) -> bool:
        """Indicates whether this operator is left-associative.
        
        Returns:
            True if left-associative, False otherwise
        """
        return False

    def print(self) -> str:
        """Prints a string representation of the AST tree starting from this node.
        
        Returns:
            A formatted string showing the tree structure
        """
        return '\n'.join(self._print(0))

    def _print(self, indent: int) -> Generator[str, None, None]:
        """Generator function for recursively printing the tree structure.
        
        Args:
            indent: The current indentation level
            
        Yields:
            Lines representing each node in the tree
        """
        if indent == 0:
            yield self.__class__.__name__
        elif indent > 0:
            yield '-' * indent + f' {self}'
        for child in self.children:
            yield from child._print(indent + 1)

    def __str__(self) -> str:
        """Returns a string representation of this node. Override in subclasses for custom formatting.
        
        Returns:
            The string representation
        """
        return self.__class__.__name__
