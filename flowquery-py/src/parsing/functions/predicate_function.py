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

    @property
    def name(self) -> str:
        return self._name

    @property
    def reference(self) -> ASTNode:
        return self.first_child()

    @property
    def array(self) -> ASTNode:
        return self.get_children()[1].first_child()

    @property
    def _return(self) -> ASTNode:
        return self.get_children()[2]

    @property
    def where(self) -> Optional[ASTNode]:
        # Import at runtime to avoid circular dependency
        if len(self.get_children()) == 4:
            return self.get_children()[3]
        return None

    def value(self) -> Any:
        raise NotImplementedError("Method not implemented.")

    def __str__(self) -> str:
        return f"PredicateFunction ({self._name})"
