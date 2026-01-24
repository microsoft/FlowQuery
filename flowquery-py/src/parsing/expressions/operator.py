"""Operator classes for FlowQuery expressions."""

from abc import ABC, abstractmethod
from typing import Any

from ..ast_node import ASTNode


class Operator(ASTNode, ABC):
    """Base class for all operators in FlowQuery."""

    def __init__(self, precedence: int, left_associative: bool):
        super().__init__()
        self._precedence = precedence
        self._left_associative = left_associative

    def is_operator(self) -> bool:
        return True

    @property
    def precedence(self) -> int:
        return self._precedence

    @property
    def left_associative(self) -> bool:
        return self._left_associative

    @abstractmethod
    def value(self) -> Any:
        pass

    @property
    def lhs(self) -> ASTNode:
        return self.get_children()[0]

    @property
    def rhs(self) -> ASTNode:
        return self.get_children()[1]


class Add(Operator):
    def __init__(self):
        super().__init__(1, True)

    def value(self) -> Any:
        return self.lhs.value() + self.rhs.value()


class Subtract(Operator):
    def __init__(self):
        super().__init__(1, True)

    def value(self) -> Any:
        return self.lhs.value() - self.rhs.value()


class Multiply(Operator):
    def __init__(self):
        super().__init__(2, True)

    def value(self) -> Any:
        return self.lhs.value() * self.rhs.value()


class Divide(Operator):
    def __init__(self):
        super().__init__(2, True)

    def value(self) -> Any:
        return self.lhs.value() / self.rhs.value()


class Modulo(Operator):
    def __init__(self):
        super().__init__(2, True)

    def value(self) -> Any:
        return self.lhs.value() % self.rhs.value()


class Power(Operator):
    def __init__(self):
        super().__init__(3, False)

    def value(self) -> Any:
        return self.lhs.value() ** self.rhs.value()


class Equals(Operator):
    def __init__(self):
        super().__init__(0, True)

    def value(self) -> int:
        return 1 if self.lhs.value() == self.rhs.value() else 0


class NotEquals(Operator):
    def __init__(self):
        super().__init__(0, True)

    def value(self) -> int:
        return 1 if self.lhs.value() != self.rhs.value() else 0


class GreaterThan(Operator):
    def __init__(self):
        super().__init__(0, True)

    def value(self) -> int:
        return 1 if self.lhs.value() > self.rhs.value() else 0


class LessThan(Operator):
    def __init__(self):
        super().__init__(0, True)

    def value(self) -> int:
        return 1 if self.lhs.value() < self.rhs.value() else 0


class GreaterThanOrEqual(Operator):
    def __init__(self):
        super().__init__(0, True)

    def value(self) -> int:
        return 1 if self.lhs.value() >= self.rhs.value() else 0


class LessThanOrEqual(Operator):
    def __init__(self):
        super().__init__(0, True)

    def value(self) -> int:
        return 1 if self.lhs.value() <= self.rhs.value() else 0


class And(Operator):
    def __init__(self):
        super().__init__(-1, True)

    def value(self) -> int:
        return 1 if (self.lhs.value() and self.rhs.value()) else 0


class Or(Operator):
    def __init__(self):
        super().__init__(-1, True)

    def value(self) -> int:
        return 1 if (self.lhs.value() or self.rhs.value()) else 0


class Not(Operator):
    def __init__(self):
        super().__init__(0, True)

    def is_operator(self) -> bool:
        return False

    def value(self) -> int:
        return 1 if not self.lhs.value() else 0


class Is(Operator):
    def __init__(self):
        super().__init__(-1, True)

    def value(self) -> int:
        return 1 if self.lhs.value() == self.rhs.value() else 0
