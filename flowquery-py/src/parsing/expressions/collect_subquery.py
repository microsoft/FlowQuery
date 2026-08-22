"""COLLECT { ... } subquery expression."""

from typing import Any, List

from .subquery_expression import SubqueryExpression


class CollectSubquery(SubqueryExpression):
    """`COLLECT { ... }` -- the single returned column gathered into a list."""

    def reduce(self, rows: List[Any], count: int) -> Any:
        if not rows:
            return []
        keys = list(rows[0].keys())
        if len(keys) != 1:
            raise ValueError("COLLECT subquery must return exactly one column")
        key = keys[0]
        return [r[key] for r in rows]
