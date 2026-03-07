"""Base class for predicate functions in FlowQuery."""

from typing import TYPE_CHECKING, Any, Optional

from ..ast_node import ASTNode
from .value_holder import ValueHolder

if TYPE_CHECKING:
    pass


class PredicateFunction(ASTNode):
    """Base class for predicate functions."""

    def __init__(self, name: Optional[str] = None):
        super().__init__()
        self._name = name or self.__class__.__name__
        self._value_holder = ValueHolder()
        self._has_return_expression = True

    @property
    def name(self) -> str:
        return self._name

    @property
    def has_return_expression(self) -> bool:
        return self._has_return_expression

    @has_return_expression.setter
    def has_return_expression(self, value: bool) -> None:
        self._has_return_expression = value

    @property
    def reference(self) -> ASTNode:
        return self.first_child()

    @property
    def array(self) -> ASTNode:
        return self.get_children()[1].first_child()

    @property
    def _return(self) -> Optional[ASTNode]:
        if not self._has_return_expression:
            return None
        return self.get_children()[2]

    @property
    def where(self) -> Optional[ASTNode]:
        if self._has_return_expression:
            if len(self.get_children()) == 4:
                return self.get_children()[3]
        else:
            if len(self.get_children()) == 3:
                return self.get_children()[2]
        return None

    def value(self) -> Any:
        raise NotImplementedError("Method not implemented.")

    def __str__(self) -> str:
        return f"PredicateFunction ({self._name})"
