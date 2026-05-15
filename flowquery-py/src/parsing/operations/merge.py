"""MERGE INTO … USING … — per-row upsert operation."""

from typing import Any, Dict, List, Optional, Set, Union, cast

from ...graph.bindings import Bindings
from ..ast_node import ASTNode
from ..expressions.expression import Expression
from .operation import Operation


class MergeSetItem:
    """One item in the ``WHEN MATCHED THEN UPDATE SET`` list.

    ``field`` is the name of the field on the matched target row to
    overwrite; ``expression`` is the value to assign.  When
    ``expression`` is ``None``, the default is ``source.<field>`` —
    i.e. the value of the same-named field on the current incoming
    row.  This makes the partial-merge case (``SET .name, .email``)
    ergonomic without having to write
    ``SET .name = source.name, .email = source.email``.
    """

    def __init__(self, field: str, expression: Optional[Expression]):
        self.field = field
        self.expression = expression


class MergeMatchedUpdate:
    """``WHEN MATCHED THEN UPDATE SET <items>`` action."""

    type: str = "update"

    def __init__(self, set_items: List[MergeSetItem]):
        self.set_items = set_items


class MergeMatchedDelete:
    """``WHEN MATCHED THEN DELETE`` action."""

    type: str = "delete"


MergeMatchedAction = Union[MergeMatchedUpdate, MergeMatchedDelete]


class MergeNotMatchedInsert:
    """``WHEN NOT MATCHED THEN INSERT [<expr>]`` action.  ``expression``
    is ``None`` for the bare-insert default (the source row itself).
    """

    type: str = "insert"

    def __init__(self, expression: Optional[Expression]):
        self.expression = expression


class MergeOnKeys:
    """``ON <key>`` or ``ON (<k1>, <k2>, …)`` — positional key match."""

    type: str = "keys"

    def __init__(self, keys: List[str]):
        self.keys = keys


class MergeOnPredicate:
    """``ON <predicate>`` — arbitrary per-pair predicate."""

    type: str = "predicate"

    def __init__(self, predicate: Expression):
        self.predicate = predicate


MergeOnClause = Union[MergeOnKeys, MergeOnPredicate]


class MergeTargetAlias(ASTNode):
    """Proxy AST node used by the parser to register the target alias
    in the variable scope while parsing the ON predicate and SET /
    INSERT expressions.  Resolves to the row currently exposed by the
    owning Merge instance.
    """

    def __init__(self, merge: "Merge"):
        super().__init__()
        self._merge = merge

    def value(self) -> Any:
        return self._merge.target_value()


class MergeSourceAlias(ASTNode):
    """Proxy AST node for the source alias (see :class:`MergeTargetAlias`)."""

    def __init__(self, merge: "Merge"):
        super().__init__()
        self._merge = merge

    def value(self) -> Any:
        return self._merge.source_value()


class Merge(Operation):
    """``MERGE INTO <name> [AS <target>] USING <source-rhs> [AS <source>]
    ON ( <key> | (<k1>, <k2>, …) | <predicate> )
    [ WHEN MATCHED THEN UPDATE SET <set-list> ]
    [ WHEN MATCHED THEN DELETE ]
    [ WHEN NOT MATCHED THEN INSERT [<expr>] ]``

    SQL-MERGE-style upsert into an existing list-binding.  The source
    may be any expression, sub-query, or bare binding name; both the
    ``target`` and ``source`` aliases are in scope inside the ``ON``
    predicate and any ``SET .field = <expr>`` / ``INSERT <expr>``
    expressions, allowing per-pair computation across both sides.
    """

    def __init__(
        self,
        name: str,
        target_alias: Optional[str],
        source_alias: Optional[str],
        source_expression: Optional[Expression],
        source_sub_query: Optional[ASTNode],
        on_clause: MergeOnClause,
        matched: Optional[MergeMatchedAction],
        not_matched: Optional[MergeNotMatchedInsert],
    ):
        super().__init__()
        self._name = name
        self._target_alias = target_alias
        self._source_alias = source_alias
        self._source_expression = source_expression
        self._source_sub_query = source_sub_query
        self._on_clause = on_clause
        self._matched = matched
        self._not_matched = not_matched
        self._current_target: Any = None
        self._current_source: Any = None
        self._value: List[Any] = []
        if source_expression is not None:
            self.add_child(source_expression)
        if source_sub_query is not None:
            self.add_child(source_sub_query)
        # `on_clause` / `matched` / `not_matched` children are wired up
        # by `set_clauses`, which the parser calls after parsing those
        # expressions in the alias-augmented scope.

    def set_clauses(
        self,
        on_clause: MergeOnClause,
        matched: Optional[MergeMatchedAction],
        not_matched: Optional[MergeNotMatchedInsert],
    ) -> None:
        """Replace placeholder ON / matched / not-matched clauses with
        their parsed counterparts (used by the parser, which must
        register the Merge in its variable scope before parsing the
        expressions inside these clauses so that target / source
        aliases resolve to this node)."""
        self._on_clause = on_clause
        self._matched = matched
        self._not_matched = not_matched
        if isinstance(on_clause, MergeOnPredicate):
            self.add_child(on_clause.predicate)
        if isinstance(matched, MergeMatchedUpdate):
            for item in matched.set_items:
                if item.expression is not None:
                    self.add_child(item.expression)
        if not_matched is not None and not_matched.expression is not None:
            self.add_child(not_matched.expression)

    @property
    def name(self) -> str:
        return self._name

    @property
    def target_alias(self) -> Optional[str]:
        return self._target_alias

    @property
    def source_alias(self) -> Optional[str]:
        return self._source_alias

    @property
    def source_expression(self) -> Optional[Expression]:
        return self._source_expression

    @property
    def source_sub_query(self) -> Optional[ASTNode]:
        return self._source_sub_query

    @property
    def on_clause(self) -> MergeOnClause:
        return self._on_clause

    @property
    def matched(self) -> Optional[MergeMatchedAction]:
        return self._matched

    @property
    def not_matched(self) -> Optional[MergeNotMatchedInsert]:
        return self._not_matched

    def target_value(self) -> Any:
        return self._current_target

    def source_value(self) -> Any:
        return self._current_source

    async def run(self) -> None:
        bindings = Bindings.get_instance()
        if not bindings.has(self._name):
            raise RuntimeError(
                f"Binding '{self._name}' is not defined; use LET to create it"
            )
        if bindings.is_refreshable(self._name):
            raise RuntimeError(
                f"Binding '{self._name}' is refreshable; use REFRESH BINDING "
                f"{self._name} to re-evaluate or DROP BINDING {self._name} first"
            )
        existing = bindings.get(self._name)
        if not isinstance(existing, list):
            raise RuntimeError(
                f"MERGE INTO {self._name} requires '{self._name}' to be a list"
            )
        # Evaluate source once.
        source: Any
        if self._source_sub_query is not None:
            first = cast(Operation, self._source_sub_query.first_child())
            last = cast(Operation, self._source_sub_query.last_child())
            await first.initialize()
            await first.run()
            await first.finish()
            source = last.results
        elif self._source_expression is not None:
            source = self._source_expression.value()
        else:
            source = None
        if not isinstance(source, list):
            raise RuntimeError(
                f"MERGE INTO {self._name} USING … requires the source to "
                "evaluate to a list of rows"
            )

        result: List[Any] = list(existing)
        tombstones: Set[int] = set()

        for source_row in source:
            self._current_source = source_row
            matched_index = self._find_match(result, tombstones, source_row)
            if matched_index != -1:
                self._current_target = result[matched_index]
                if self._matched is not None:
                    if isinstance(self._matched, MergeMatchedDelete):
                        tombstones.add(matched_index)
                    else:
                        result[matched_index] = self._apply_set(
                            result[matched_index], self._matched.set_items
                        )
                self._current_target = None
            else:
                if self._not_matched is not None:
                    inserted = (
                        self._not_matched.expression.value()
                        if self._not_matched.expression is not None
                        else source_row
                    )
                    result.append(inserted)
        self._current_source = None

        swept: List[Any] = [
            r for i, r in enumerate(result) if i not in tombstones
        ]
        bindings.set(self._name, swept)
        self._value = swept
        if self.next:
            await self.next.run()

    def _find_match(
        self, target: List[Any], tombstones: Set[int], source_row: Any
    ) -> int:
        if isinstance(self._on_clause, MergeOnKeys):
            keys = self._on_clause.keys
            if not isinstance(source_row, dict):
                return -1
            for k in keys:
                if k not in source_row:
                    return -1
            for i, t in enumerate(target):
                if i in tombstones:
                    continue
                if not isinstance(t, dict):
                    continue
                matches = True
                for k in keys:
                    if k not in t or t[k] != source_row[k]:
                        matches = False
                        break
                if matches:
                    return i
            return -1
        predicate = self._on_clause.predicate
        for i, t in enumerate(target):
            if i in tombstones:
                continue
            self._current_target = t
            ok = predicate.value()
            if ok:
                self._current_target = None
                return i
        self._current_target = None
        return -1

    def _apply_set(
        self, target_row: Any, set_items: List[MergeSetItem]
    ) -> Dict[str, Any]:
        base: Dict[str, Any] = (
            dict(target_row) if isinstance(target_row, dict) else {}
        )
        for item in set_items:
            if item.expression is not None:
                base[item.field] = item.expression.value()
            else:
                src = self._current_source
                if isinstance(src, dict) and item.field in src:
                    base[item.field] = src[item.field]
        return base

    @property
    def results(self) -> List[Any]:
        return self._value
