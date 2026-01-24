"""Base class for predicate functions in FlowQuery."""

from typing import Any, Optional

from ..ast_node import ASTNode
from ..expressions.expression import Expression
from ..expressions.reference import Reference
from .value_holder import ValueHolder


class PredicateFunction(ASTNode):
    """Base class for predicate functions."""

    def __init__(self, name: Optional[str] = None):
        super().__init__()
        self._name = name or self.__class__.__name__
        self._value_holder = ValueHolder()

    @property
    def name(self) -> str:
        return self._name

    @property
    def reference(self) -> Reference:
        return self.first_child()

    @property
    def array(self) -> ASTNode:
        return self.get_children()[1].first_child()

    @property
    def _return(self) -> Expression:
        return self.get_children()[2]

    @property
    def where(self) -> Optional['Where']:
        from ..operations.where import Where
        if len(self.get_children()) == 4:
            return self.get_children()[3]
        return None

    def value(self) -> Any:
        raise NotImplementedError("Method not implemented.")

    def __str__(self) -> str:
        return f"PredicateFunction ({self._name})"
