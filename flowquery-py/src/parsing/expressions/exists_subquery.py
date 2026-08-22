"""EXISTS { ... } subquery expression."""

from typing import Any, List

from .subquery_expression import SubqueryExpression


class ExistsSubquery(SubqueryExpression):
    """`EXISTS { ... }` -- True when the subquery produces at least one row."""

    def reduce(self, rows: List[Any], count: int) -> Any:
        return count > 0
