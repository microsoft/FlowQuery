"""Graph pattern representation for FlowQuery."""

from __future__ import annotations

from contextlib import aclosing
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, AsyncGenerator, Dict, Generator, List, Optional, Sequence, Union

from ..parsing.ast_node import ASTNode
from .data_resolver import DataResolver
from .graph_records import common_origin, is_graph_record, origin_matches
from .node import Node
from .node_data import NodeData
from .relationship import Relationship, RelationshipScope
from .relationship_data import RelationshipData
from .source_access import MemoryNodeAccess, MemoryRelationshipAccess, is_static_expression

if TYPE_CHECKING:
    from .source_context import SourceContext


class Pattern(ASTNode):
    """Represents a graph pattern for matching."""

    def __init__(self) -> None:
        super().__init__()
        self._identifier: Optional[str] = None
        self._chain: List[Union['Node', 'Relationship']] = []
        self._context: Optional['SourceContext'] = None
        self._deferred: bool = False
        self._scope: RelationshipScope = RelationshipScope()

    @property
    def identifier(self) -> Optional[str]:
        return self._identifier

    @identifier.setter
    def identifier(self, value: str) -> None:
        self._identifier = value

    @property
    def chain(self) -> List[Union['Node', 'Relationship']]:
        return self._chain

    @property
    def elements(self) -> Sequence[ASTNode]:
        return self._chain

    def add_element(self, element: Union['Node', 'Relationship']) -> None:
        if (len(self._chain) > 0 and
            type(self._chain[-1]) is type(element)):
            raise ValueError("Cannot add two consecutive elements of the same type to the graph pattern")

        if len(self._chain) > 0:
            last = self._chain[-1]
            if isinstance(last, Node) and isinstance(element, Relationship):
                last.outgoing = element
                element.source = last
            if isinstance(last, Relationship) and isinstance(element, Node):
                last.target = element
                element.incoming = last

        self._chain.append(element)
        self.add_child(element)
        if isinstance(element, Relationship):
            element.scope = self._scope

    def set_relationship_scope(self, scope: RelationshipScope) -> None:
        """Share one relationship-uniqueness scope across several patterns
        (all patterns of one MATCH clause; internal)."""
        self._scope = scope
        for element in self._chain:
            if isinstance(element, Relationship):
                element.scope = scope

    @property
    def relationship_scope(self) -> RelationshipScope:
        return self._scope

    @relationship_scope.setter
    def relationship_scope(self, scope: RelationshipScope) -> None:
        self.set_relationship_scope(scope)

    @property
    def start_node(self) -> 'Node':
        if len(self._chain) == 0:
            raise ValueError("Pattern is empty")
        first = self._chain[0]
        if isinstance(first, Node):
            return first
        raise ValueError("Pattern does not start with a node")

    @property
    def end_node(self) -> 'Node':
        if len(self._chain) == 0:
            raise ValueError("Pattern is empty")
        last = self._chain[-1]
        if isinstance(last, Node):
            return last
        raise ValueError("Pattern does not end with a node")

    def first_node(self) -> Optional[Union['Node', 'Relationship']]:
        if len(self._chain) > 0:
            return self._chain[0]
        return None

    def value(self) -> List[Any]:
        return list(self.values())

    def values(self) -> Generator[Any, None, None]:
        for i, element in enumerate(self._chain):
            if isinstance(element, Node):
                # Skip node if previous element was a zero-hop relationship (no matches)
                prev = self._chain[i-1] if i > 0 else None
                if isinstance(prev, Relationship) and len(prev.matches) == 0:
                    continue
                yield element.value()
            elif isinstance(element, Relationship):
                for j, match in enumerate(element.matches):
                    yield match
                    if j < len(element.matches) - 1:
                        yield match["endNode"]

    async def fetch_data(self, ctx: Optional['SourceContext'] = None) -> None:
        """Loads data for all elements; provider-backed elements are deferred."""
        resolver = DataResolver.get_instance()
        context = ctx if ctx is not None else resolver.source_context
        self._context = context
        self._deferred = False
        for element in self._chain:
            # Use type name comparison to avoid issues with module double-loading
            kind = type(element).__name__
            if kind in ('NodeReference', 'RelationshipReference'):
                continue
            access = resolver.get_access(element, context) if context is not None else None
            if access is not None:
                self._deferred = True
                if kind in ('Node', 'Relationship'):
                    element.set_data(None)
                    element.set_access(access)
                continue
            data = await resolver.get_data(element)
            if isinstance(element, Node) and isinstance(data, NodeData):
                element.set_access(None)
                element.set_data(data)
            elif isinstance(element, Relationship) and isinstance(data, RelationshipData):
                element.set_access(None)
                element.set_data(data)

    async def initialize(self) -> None:
        await self.fetch_data()

    @property
    def deferred(self) -> bool:
        """True when at least one element is read through a source provider."""
        return self._deferred

    async def traverse(self) -> AsyncGenerator[None, None]:
        """Enumerate pattern matches.

        Provider-backed patterns may start from the more selective end node;
        otherwise traversal starts at the first node exactly as before.
        """
        plan = self._plan_reversal() if self._deferred else None
        if plan is None:
            first = self.first_node()
            if first is not None and isinstance(first, Node):
                async with aclosing(first.next()) as _gen1:
                    async for _ in _gen1:
                        yield
            return
        rel_rows: List[Optional[Dict[str, Any]]] = [None] * len(plan.rels)
        async with aclosing(self._reverse_from(plan, len(plan.nodes) - 1, _UNSET, rel_rows)) as _gen2:
            async for _ in _gen2:
                yield

    def _plan_reversal(self) -> Optional['_ReversalPlan']:
        ctx = self._context
        if (
            ctx is None
            or not ctx.options.reorder
            or self._identifier is not None
            or len(self._chain) < 3
        ):
            return None
        nodes: List[Node] = []
        rels: List[Relationship] = []
        local: List[Any] = []
        for element in self._chain:
            if type(element).__name__ == 'Node':
                local.append(element)
                if element.identifier is not None:
                    local.append(element.identifier)
        for element in self._chain:
            kind = type(element).__name__
            if isinstance(element, Relationship):
                if kind != 'Relationship' or element.hops.multi():
                    return None
                rels.append(element)
                continue
            if kind not in ('Node', 'NodeReference'):
                return None
            if kind == 'NodeReference':
                # A reference to a node of this same pattern is only bound
                # during forward traversal.
                reference = getattr(element, 'reference', None)
                if any(reference is item for item in local) or (
                    element.identifier is not None and element.identifier in local
                ):
                    return None
            else:
                for expression in element.properties.values():
                    if not is_static_expression(expression):
                        return None
            nodes.append(element)
        first = nodes[0]
        last = nodes[-1]
        first_score = Pattern._score(first)
        last_score = Pattern._score(last)
        reverse = last_score > first_score
        reason = f"start score {first_score}, end score {last_score}"
        if last_score == first_score and first.access is not None and last.access is not None:
            a = first.access.estimate(*first.source_terms())
            b = last.access.estimate(*last.source_terms())
            if a is not None and b is not None:
                reason += f", estimates {_fmt(a)} vs {_fmt(b)}"
                reverse = b < a
        ctx.stats["plans"].append(
            {"pattern": self._describe(), "start": "last" if reverse else "first", "reason": reason}
        )
        if not reverse:
            return None
        node_access: List[Any] = []
        for n in nodes:
            if type(n).__name__ == 'NodeReference':
                node_access.append(None)
            elif n.access is not None:
                node_access.append(n.access)
            else:
                data = n.get_data()
                node_access.append(MemoryNodeAccess(data.records if data is not None else []))
        rel_access: List[Any] = []
        for r in rels:
            if r.access is not None:
                rel_access.append(r.access)
            else:
                rdata = r.get_data()
                rel_access.append(
                    MemoryRelationshipAccess(rdata.records if rdata is not None else [])
                )
        return _ReversalPlan(nodes, rels, node_access, rel_access)

    @staticmethod
    def _score(node: Node) -> int:
        """Selectivity rank of a candidate start node (higher is more selective)."""
        if type(node).__name__ == 'NodeReference':
            return 3
        terms, _ = node.source_terms()
        has_id = any(
            t["op"] == "eq" and t["property"] == "id" and t.get("value") is not None
            for t in terms
        )
        if has_id and (node.access is None or node.access.can_lookup()):
            return 2
        if node.access is not None and node.access.deferred and node.access.pushes(terms):
            return 1
        return 0

    def _describe(self) -> str:
        parts: List[str] = []
        for e in self._chain:
            if isinstance(e, Node):
                labels = "".join(f":{label}" for label in e.labels)
                parts.append(f"({e.identifier or ''}{labels})")
            else:
                types = "|".join(f":{t}" for t in e.types)
                body = f"[{e.identifier or ''}{types}]"
                parts.append(f"<-{body}-" if e.direction == "left" else f"-{body}->")
        return "".join(parts)

    async def _reverse_from(
        self,
        plan: '_ReversalPlan',
        i: int,
        id_: Any,
        rel_rows: List[Optional[Dict[str, Any]]],
        origin: Optional[bool] = None,
    ) -> AsyncGenerator[None, None]:
        node = plan.nodes[i]
        access = plan.node_access[i]
        pages: Any
        filter_rows = True
        if access is None:
            reference = getattr(node, 'reference', None)
            referenced = reference.value() if reference is not None else None
            if referenced is None or (
                id_ is not _UNSET
                and (id_ != referenced.get("id") or not origin_matches(referenced, origin))
            ):
                return
            pages = [[referenced]]
            filter_rows = False
        else:
            terms, args = node.source_terms()
            if id_ is not _UNSET:
                pages = [await access.lookup(id_, terms, args, origin)]
            else:
                id_term = next(
                    (t for t in terms if t["op"] == "eq" and t["property"] == "id"), None
                )
                if id_term is not None and id_term.get("value") is not None and access.can_lookup():
                    pages = [await access.lookup(id_term["value"], terms, args)]
                else:
                    pages = access.scan(terms, args)
        try:
            async with aclosing(self._reverse_pages(plan, i, node, pages, filter_rows, rel_rows)) as _gen3:
                async for _ in _gen3:
                    yield
        finally:
            if hasattr(pages, "aclose"):
                await pages.aclose()

    async def _reverse_pages(
        self,
        plan: '_ReversalPlan',
        i: int,
        node: Node,
        pages: Any,
        filter_rows: bool,
        rel_rows: List[Optional[Dict[str, Any]]],
    ) -> AsyncGenerator[None, None]:
        async with aclosing(_iterate(pages)) as page_iter:
            async for page in page_iter:
                rows = [row for row in page if node.matches_record(row)] if filter_rows else page
                rel = plan.rels[i - 1] if i > 0 else None
                # Walking backwards, the anchor is the stored endpoint of the node
                # we are on, and the next id is the opposite endpoint.
                side = "left" if rel is not None and rel.next_field == "left_id" else "right"
                next_field = "right_id" if side == "left" else "left_id"
                rel_terms, rel_args = rel.source_terms() if rel is not None else ([], None)
                prev = plan.node_access[i - 1] if i > 0 else None
                if rel is not None and len(rows) > 1:
                    buffered = await plan.rel_access[i - 1].prefetch(
                        [r.get("id") for r in rows], side, rel_terms, rel_args, common_origin(rows)
                    )
                    if buffered is not None and prev is not None and prev.deferred:
                        prev_terms, prev_args = plan.nodes[i - 1].source_terms()
                        await prev.prefetch(
                            [r.get(next_field) for r in buffered],
                            prev_terms,
                            prev_args,
                            common_origin(buffered),
                        )
                for row in rows:
                    node.set_value(row)
                    if rel is None:
                        async with aclosing(self._emit_reversed(plan, rel_rows)) as _gen4:
                            async for _ in _gen4:
                                yield
                        continue
                    expansion = plan.rel_access[i - 1].expand(
                        row.get("id"), side, rel_terms, rel_args, is_graph_record(row)
                    )
                    try:
                        async for rel_page in expansion:
                            if prev is not None and prev.deferred and len(rel_page) > 1:
                                prev_terms, prev_args = plan.nodes[i - 1].source_terms()
                                await prev.prefetch(
                                    [r.get(next_field) for r in rel_page],
                                    prev_terms,
                                    prev_args,
                                    common_origin(rel_page),
                                )
                            for rel_row in rel_page:
                                if not rel.matches_record(rel_row):
                                    continue
                                claimed = rel.claim(rel_row)
                                if claimed is None:
                                    continue
                                try:
                                    rel_rows[i - 1] = rel_row
                                    async with aclosing(self._reverse_from(
                                        plan,
                                        i - 1,
                                        rel_row.get(next_field),
                                        rel_rows,
                                        is_graph_record(rel_row),
                                    )) as _gen5:
                                        async for _ in _gen5:
                                            yield
                                finally:
                                    rel.release(claimed)
                    finally:
                        await expansion.aclose()

    async def _emit_reversed(
        self, plan: '_ReversalPlan', rel_rows: List[Optional[Dict[str, Any]]]
    ) -> AsyncGenerator[None, None]:
        """All nodes are bound: publish relationship matches in pattern order."""
        for j, rel in enumerate(plan.rels):
            record = rel_rows[j] or {}
            start = plan.nodes[j].value()
            rel.set_frame(0, record)
            start_id: Any = start.get("id") if start is not None else None
            rel.push_match(record, start_id)
            rel.set_end_node(plan.nodes[j + 1])
        try:
            yield
        finally:
            for j in range(len(plan.rels) - 1, -1, -1):
                plan.rels[j].pop_match()
                if plan.rels[j].access is None:
                    plan.rels[j].clear_frame(0)


class _Unset:
    pass


_UNSET: Any = _Unset()


def _fmt(value: float) -> str:
    return str(int(value)) if float(value).is_integer() else str(value)


async def _iterate(pages: Any) -> AsyncGenerator[List[Dict[str, Any]], None]:
    if hasattr(pages, "__aiter__"):
        async for page in pages:
            yield page
    else:
        for page in pages:
            yield page


@dataclass
class _ReversalPlan:
    nodes: List[Node]
    rels: List[Relationship]
    node_access: List[Any]
    rel_access: List[Any]
