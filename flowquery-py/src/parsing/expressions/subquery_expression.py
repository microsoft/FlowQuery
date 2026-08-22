"""Base class for EXISTS, COUNT, and COLLECT subquery expressions."""

from typing import Any, List

from ..ast_node import ASTNode
from ..operations.operation import Operation


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
    """Base class for the brace-delimited subquery expressions.

    The base executes the nested query and hands the resulting rows and
    row-count to `reduce()`, which each concrete subclass (ExistsSubquery,
    CountSubquery, CollectSubquery) implements to produce its value.
    """

    def __init__(self, subquery_ast: ASTNode) -> None:
        super().__init__()
        self._subquery_ast = subquery_ast
        self._value: Any = None

    def introduces_scope(self) -> bool:
        return True

    async def evaluate(self) -> None:
        from ...compute.runner import Runner
        from ..operations.return_op import Return

        first = self._subquery_ast.first_child()
        last = self._subquery_ast.last_child()

        if not isinstance(first, Operation) or not isinstance(last, Operation):
            raise ValueError("Subquery AST must contain Operations")

        rows: List[Any] = []
        count = 0

        if isinstance(last, Return):
            runner = Runner(ast=self._subquery_ast)
            await runner.run()
            rows = runner.results or []
            count = len(rows)
        else:
            # Subquery without RETURN (e.g., EXISTS { MATCH ... })
            counter = RowCounter()
            saved_next = last.next
            last.next = counter

            await first.initialize()
            await first.run()
            await first.finish()

            last.next = saved_next
            count = counter.count

        self._value = self.reduce(rows, count)

    def value(self) -> Any:
        return self._value

    def reduce(self, rows: List[Any], count: int) -> Any:
        raise NotImplementedError
