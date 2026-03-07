"""Subquery expression for EXISTS, COUNT, and COLLECT subqueries."""

from enum import Enum
from typing import Any, List

from ..ast_node import ASTNode
from ..operations.operation import Operation


class SubqueryMode(Enum):
    EXISTS = "exists"
    COUNT = "count"
    COLLECT = "collect"


class RowCounter(Operation):
    """Counts rows flowing through an operation chain without producing results.

    Used by SubqueryExpression to evaluate MATCH-only subqueries (no RETURN).
    """

    def __init__(self) -> None:
        super().__init__()
        self.count: int = 0

    async def run(self) -> None:
        self.count += 1


class SubqueryExpression(ASTNode):
    """Represents an EXISTS, COUNT, or COLLECT subquery expression.

    Evaluates an inner query pipeline and returns:
    - EXISTS: True if the subquery produced any rows
    - COUNT: The number of rows produced
    - COLLECT: A list of single-column values from the subquery results
    """

    def __init__(self, mode: SubqueryMode, subquery_ast: ASTNode) -> None:
        super().__init__()
        self._mode = mode
        self._subquery_ast = subquery_ast
        self._results: List[Any] = []
        self._row_count: int = 0

    @property
    def mode(self) -> SubqueryMode:
        return self._mode

    async def evaluate(self) -> None:
        from ...compute.runner import Runner
        from ..operations.return_op import Return

        self._results = []
        self._row_count = 0

        first = self._subquery_ast.first_child()
        last = self._subquery_ast.last_child()

        if not isinstance(first, Operation) or not isinstance(last, Operation):
            raise ValueError("Subquery AST must contain Operations")

        if isinstance(last, Return):
            runner = Runner(ast=self._subquery_ast)
            await runner.run()
            self._results = runner.results or []
            self._row_count = len(self._results)
        else:
            # Subquery without RETURN (e.g., EXISTS { MATCH ... })
            counter = RowCounter()
            saved_next = last.next
            last.next = counter

            await first.initialize()
            await first.run()
            await first.finish()

            last.next = saved_next
            self._row_count = counter.count

    def value(self) -> Any:
        if self._mode == SubqueryMode.EXISTS:
            return self._row_count > 0
        elif self._mode == SubqueryMode.COUNT:
            return self._row_count
        elif self._mode == SubqueryMode.COLLECT:
            if not self._results:
                return []
            keys = list(self._results[0].keys())
            if len(keys) != 1:
                raise ValueError("COLLECT subquery must return exactly one column")
            key = keys[0]
            return [r[key] for r in self._results]
        return None
