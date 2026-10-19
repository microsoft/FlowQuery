"""Represents a reference to a query parameter (e.g., ``$args``, ``$name``).

Parameter references are resolved at runtime from parameters passed
to the Runner, rather than from the variable scope.  Inside virtual
definitions ``$args`` / ``$request`` carry the pass-down filter and
source request; in top-level queries ``$name`` resolves from
``RunnerOptions.parameters``.

Example:
    # In a CREATE VIRTUAL definition:
    # CREATE VIRTUAL (:Node) AS { RETURN $args.id AS id }
    # $args is a ParameterReference resolved from MATCH constraints
    ref = ParameterReference("$args", True)
    ref.parameter_value = {"id": 42}
    print(ref.value())  # {"id": 42}
"""

from typing import Any

from ..ast_node import ASTNode


class ParameterReference(ASTNode):
    """Represents a reference to a query parameter (e.g., $args, $id)."""

    def __init__(self, name: str, in_virtual_definition: bool = False) -> None:
        super().__init__()
        self._name = name
        self._parameter_value: Any = None
        self._in_virtual_definition = in_virtual_definition

    @property
    def name(self) -> str:
        return self._name

    @property
    def in_virtual_definition(self) -> bool:
        """True when this reference appears inside a virtual definition body."""
        return self._in_virtual_definition

    @property
    def parameter_value(self) -> Any:
        return self._parameter_value

    @parameter_value.setter
    def parameter_value(self, value: Any) -> None:
        self._parameter_value = value

    def is_operand(self) -> bool:
        return True

    def value(self) -> Any:
        return self._parameter_value

    def __str__(self) -> str:
        return f"ParameterReference ({self._name})"
