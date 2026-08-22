"""COUNT { ... } subquery expression."""

from typing import Any, List

from .subquery_expression import SubqueryExpression


class CountSubquery(SubqueryExpression):
    """`COUNT { ... }` -- the number of rows the subquery produces."""

    def reduce(self, rows: List[Any], count: int) -> Any:
        return count
