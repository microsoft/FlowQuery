"""Executes a FlowQuery statement and retrieves the results."""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from ..graph.bindings import Bindings
from ..graph.data_cache import DataCache
from ..graph.data_resolver import DataResolver
from ..graph.node import Node as GraphNode
from ..graph.relationship import Relationship as GraphRelationship
from ..parsing.ast_node import ASTNode
from ..parsing.expressions.binding_reference import BindingReference
from ..parsing.expressions.parameter_reference import ParameterReference
from ..parsing.operations.aggregated_with import AggregatedWith
from ..parsing.operations.create_node import CreateNode
from ..parsing.operations.create_relationship import CreateRelationship
from ..parsing.operations.delete_node import DeleteNode
from ..parsing.operations.delete_relationship import DeleteRelationship
from ..parsing.operations.load import Load
from ..parsing.operations.match import Match
from ..parsing.operations.operation import Operation
from ..parsing.operations.return_op import Return
from ..parsing.operations.union import Union
from ..parsing.parser import Parser
from ..parsing.statement_info_crawler import (
    ColumnLineage,
    ColumnReference,
    StatementInfo,
    StatementInfoCrawler,
)
from .provenance import (
    NodeBinding,
    ProvenanceSites,
    ProvenanceSource,
    RelationshipBinding,
    RowProvenance,
)


@dataclass
class RunnerOptions:
    """Optional configuration for a :class:`Runner` invocation.

    When ``provenance`` is ``True``, the runner records row-level data
    lineage alongside the results: for each emitted row, which
    concrete node ids and relationship ``(left_id, right_id, type)``
    hops were bound while the row was being projected.  Access via
    :attr:`Runner.provenance`.

    Each :class:`NodeBinding` and :class:`RelationshipHop` also
    carries:

    * ``properties``: a shallow copy of the matched record's
      user-visible property values.
    * ``source``: when the record came from a ``CREATE VIRTUAL (:X)
      AS { ... }`` sub-query, the inner runner's :class:`RowProvenance`
      row that produced it.  Recursive: a virtual that matches another
      virtual carries nested ``source`` chains.

    Defaults to ``False``; when disabled the runner has zero
    provenance overhead.
    """

    provenance: bool = False


@dataclass
class RunnerMetadata:
    """Metadata about the operations performed by a Runner execution.

    The four counters track CREATE/DELETE VIRTUAL operations. The optional
    :attr:`info` field carries deeper structural information about the
    statement(s) - labels, relationship types, sources, and properties -
    produced by :class:`~..parsing.statement_info_crawler.StatementInfoCrawler`.
    """

    virtual_nodes_created: int = 0
    virtual_relationships_created: int = 0
    virtual_nodes_deleted: int = 0
    virtual_relationships_deleted: int = 0
    info: Optional[StatementInfo] = field(default=None)


@dataclass
class CellBindingTrace:
    """One slice of runtime provenance that contributed to a result
    cell.

    Pairs the column's :class:`ColumnReference` (i.e.
    ``alias.property``) with the matching node or relationship
    binding from the row provenance.

    ``value`` is the observed value of ``reference.property`` on the
    matched record:

    * For nodes: ``node.id`` when ``reference.property == 'id'``,
      otherwise ``node.properties[reference.property]``.
    * For relationships: built-ins (``left_id``, ``right_id``,
      ``type``) come from ``hops[0]`` directly; everything else comes
      from ``hops[0].properties``.

    ``None`` when the binding doesn't carry that property (e.g. an
    OPTIONAL MATCH miss).
    """

    reference: ColumnReference
    value: Any
    node: Optional[NodeBinding] = None
    relationship: Optional[RelationshipBinding] = None


@dataclass
class CellTrace:
    """Combined lineage and provenance for a single result cell.

    Bundles the structural lineage from
    ``metadata.info.returns[column]`` with the runtime bindings from
    ``provenance[row_index]`` that contributed to the cell.  Produced
    by :meth:`Runner.trace_row` and :meth:`Runner.lineage`.
    """

    column: str
    value: Any
    lineage: Optional[ColumnLineage]
    bindings: List[CellBindingTrace] = field(default_factory=list)


@dataclass
class LineageReport:
    """Combined structural lineage and per-row provenance for an
    entire Runner execution.  Produced by :meth:`Runner.lineage`.

    ``columns`` is a deep copy of ``metadata.info.returns``.
    ``rows`` is one ``{column -> CellTrace}`` map per result row,
    aligned by index with :attr:`Runner.results`.
    """

    columns: Dict[str, ColumnLineage] = field(default_factory=dict)
    rows: List[Dict[str, CellTrace]] = field(default_factory=list)


class _ParsedStatement:
    """Internal representation of a parsed statement."""

    __slots__ = ("ast", "first", "last")

    def __init__(self, ast: ASTNode) -> None:
        self.ast = ast
        first = ast.first_child()
        last = ast.last_child()
        if not isinstance(first, Operation) or not isinstance(last, Operation):
            raise ValueError("AST must contain Operations")
        self.first: Operation = first
        self.last: Operation = last


class Runner:
    """Executes a FlowQuery statement and retrieves the results.

    The Runner class parses a FlowQuery statement into an AST and executes it,
    managing the execution flow from the first operation to the final return statement.

    Supports multi-statement queries separated by semicolons. Only CREATE and DELETE
    statements may appear before the last statement. If a retrieval statement is present,
    it must be the last statement.

    Example:
        runner = Runner("WITH 1 as x RETURN x")
        await runner.run()
        print(runner.results)   # [{ x: 1 }]
        print(runner.metadata)  # RunnerMetadata(virtual_nodes_created=0, ...)
    """

    def __init__(
        self,
        statement: Optional[str] = None,
        ast: Optional[ASTNode] = None,
        args: Optional[Dict[str, Any]] = None,
        options: Optional[RunnerOptions] = None,
    ):
        """Creates a new Runner instance and parses the FlowQuery statement.

        Args:
            statement: The FlowQuery statement to execute (may contain semicolon-separated statements)
            ast: An already-parsed AST (optional)
            args: Optional parameters to inject into $-prefixed parameter references
            options: Optional configuration (e.g. ``RunnerOptions(provenance=True)``)

        Raises:
            ValueError: If neither statement nor AST is provided
        """
        if (statement is None or statement == "") and ast is None:
            raise ValueError("Either statement or AST must be provided")

        self._args = args
        self._options = options or RunnerOptions()
        self._provenance: Optional[List[RowProvenance]] = None

        if ast is not None:
            self._is_top_level = False
            self._statements = [_ParsedStatement(ast)]
        else:
            self._is_top_level = True
            self._statements = [
                _ParsedStatement(root)
                for root in Parser().parse_statements(statement or "")
            ]

        self._metadata = self._compute_metadata()

    def _compute_metadata(self) -> RunnerMetadata:
        """Walks all statement ASTs to count CREATE/DELETE operations and to
        crawl the statements for richer structural info via
        :class:`~..parsing.statement_info_crawler.StatementInfoCrawler`.
        """
        metadata = RunnerMetadata()
        for stmt in self._statements:
            op: Optional[Operation] = stmt.first
            while op is not None:
                if isinstance(op, CreateNode):
                    metadata.virtual_nodes_created += 1
                elif isinstance(op, CreateRelationship):
                    metadata.virtual_relationships_created += 1
                elif isinstance(op, DeleteNode):
                    metadata.virtual_nodes_deleted += 1
                elif isinstance(op, DeleteRelationship):
                    metadata.virtual_relationships_deleted += 1
                op = op.next
        metadata.info = StatementInfoCrawler().crawl(
            [s.ast for s in self._statements]
        )
        return metadata

    async def run(self) -> None:
        """Executes the parsed FlowQuery statement(s).

        Raises:
            Exception: If an error occurs during execution
        """
        if self._is_top_level:
            # NOTE: We intentionally do NOT clear the virtual-source
            # registry here.  Plain ``dict`` records aren't weakref-able
            # in CPython, so the registry can't auto-evict like the
            # ``WeakMap`` used by the TypeScript port.  Clearing on
            # every top-level run would wipe :class:`LET`-row
            # attachments populated by a previous ``Runner.run`` call,
            # breaking ``LOAD JSON FROM <letName>`` provenance chains
            # that span runner instances.  The registry is keyed by
            # :func:`id`, so re-used object ids naturally overwrite
            # stale entries; in practice the map's footprint stays
            # bounded by the live record set.
            DataResolver.get_instance().data_cache = DataCache(
                provenance=self._options.provenance
            )
        if self._options.provenance:
            self._provenance = []
            self._enable_provenance()
        bindings_singleton = Bindings.get_instance()
        for stmt in self._statements:
            self._bind_parameters(stmt.ast)
            # Refresh any stale refreshable bindings referenced by
            # this statement.  Sub-query evaluation is async but
            # BindingReference.value() is sync, so the cache must be
            # populated up-front.
            names: set[str] = set()
            self._collect_binding_names(stmt.ast, names)
            for name in names:
                await bindings_singleton.materialize(name)
            await stmt.first.initialize()
            await stmt.first.run()
            await stmt.first.finish()

    def _enable_provenance(self) -> None:
        """Walks the terminal statement's operation chain and wires
        every MATCH-bound :class:`Node` / :class:`Relationship` slot
        to the operation that will project it.
        """
        if not self._statements:
            return
        stmt = self._statements[-1]
        assert self._provenance is not None
        Runner.wire_provenance(stmt.first, self._provenance)

    @staticmethod
    def wire_provenance(first: Operation, sink: List[RowProvenance]) -> None:
        """Walk ``first..terminal``, accumulating live MATCH sites
        into the active source list and handing it off at every
        aggregation boundary.  Each :class:`AggregatedWith` consumes
        the active list and then re-publishes itself as the single
        active source going forward.  :class:`Load` operations
        contribute per-row data-source bindings.

        Exposed as a public static so other components (e.g.
        :class:`Let` when running a sub-query right-hand side) can
        wire provenance for an operation chain they drive directly,
        without going through the full :meth:`Runner.run` lifecycle.
        """

        def make_sites() -> ProvenanceSites:
            s = ProvenanceSites()
            s.capture_properties = True
            return s

        active_sites: ProvenanceSites = make_sites()
        # Extra (non-site) sources contributed by upstream aggregations.
        active_aggregations: List[AggregatedWith] = []
        # Per-row Load operations contributing data-source bindings.
        active_loads: List[ProvenanceSource] = []
        op: Optional[Operation] = first
        terminal: Optional[Operation] = None
        while op is not None:
            if isinstance(op, Match):
                for pattern in op.patterns:
                    Runner._collect_sites_from_pattern(pattern, active_sites)
            elif isinstance(op, Load):
                active_loads.append(op.as_provenance_source())
            elif isinstance(op, AggregatedWith):
                # Aggregation boundary: hand off current sources and
                # re-publish the aggregation as the new source.
                if not active_sites.is_empty:
                    op.add_provenance_source(active_sites)
                for a in active_aggregations:
                    op.add_provenance_source(a.as_provenance_source())
                for load_src in active_loads:
                    op.add_provenance_source(load_src)
                active_sites = make_sites()
                active_aggregations = [op]
                active_loads = []
            if op.next is None:
                terminal = op
            op = op.next
        if terminal is None:
            return
        if isinstance(terminal, Union):
            # UNION composes results from two independent sub-pipelines;
            # wire each branch separately and let Union merge.
            left_sink: List[RowProvenance] = []
            right_sink: List[RowProvenance] = []
            Runner.wire_provenance(terminal.left, left_sink)
            Runner.wire_provenance(terminal.right, right_sink)
            terminal.enable_provenance(left_sink, right_sink, sink)
            return
        if isinstance(terminal, Return):
            # AggregatedReturn folds sources into its GroupBy; plain
            # Return snapshots them per emitted row.  Both share the
            # same source registration API.  We always enable the sink
            # so even source-less queries (``WITH ... RETURN``) emit
            # one ``{nodes: [], relationships: []}`` per result row
            # for shape consistency with the results array.
            if not active_sites.is_empty:
                terminal.add_provenance_source(active_sites)
            for a in active_aggregations:
                terminal.add_provenance_source(a.as_provenance_source())
            for load_src in active_loads:
                terminal.add_provenance_source(load_src)
            terminal.enable_provenance(sink)

    @staticmethod
    def _collect_sites_from_pattern(pattern: Any, sites: ProvenanceSites) -> None:
        for element in pattern.chain:
            if isinstance(element, GraphNode):
                sites.add_node(element)
            elif isinstance(element, GraphRelationship):
                sites.add_relationship(element)

    def _collect_binding_names(self, node: ASTNode, names: "set[str]") -> None:
        """Recursively walk the AST collecting BindingReference names."""
        if isinstance(node, BindingReference):
            names.add(node.name)
        for child in node.get_children():
            self._collect_binding_names(child, names)

    def _bind_parameters(self, node: ASTNode) -> None:
        """Recursively walks the AST to bind ParameterReference nodes
        to the args provided to this Runner.
        - $args resolves to the entire args map (for use with $args.key lookups)
        - $name resolves to args["name"] (shorthand for individual properties)
        """
        if isinstance(node, ParameterReference):
            args = self._args or {}
            key = node.name[1:] if node.name.startswith("$") else node.name
            if key == "args":
                node.parameter_value = args
            else:
                node.parameter_value = args.get(key)
        for child in node.get_children():
            self._bind_parameters(child)

    @property
    def results(self) -> List[Dict[str, Any]]:
        """Gets the results from the executed statement.

        Returns:
            The results from the last operation (typically a RETURN statement)
        """
        return self._statements[-1].last.results

    @property
    def provenance(self) -> List[RowProvenance]:
        """Row-level data lineage aligned by index with :attr:`results`.

        Each :class:`RowProvenance` entry lists the concrete ``id``
        values of the node slots and the ``(left_id, right_id, type)``
        hops of the relationship slots that were bound while the
        corresponding result row was being projected.

        Returns an empty list unless the runner was constructed with
        ``RunnerOptions(provenance=True)`` or the query produced no
        rows.
        """
        return self._provenance if self._provenance is not None else []

    @property
    def metadata(self) -> RunnerMetadata:
        """Gets metadata about the operations in this query.

        Returns a deep copy so callers can mutate the result without affecting
        subsequent reads.
        """
        m = self._metadata
        return RunnerMetadata(
            virtual_nodes_created=m.virtual_nodes_created,
            virtual_relationships_created=m.virtual_relationships_created,
            virtual_nodes_deleted=m.virtual_nodes_deleted,
            virtual_relationships_deleted=m.virtual_relationships_deleted,
            info=StatementInfoCrawler.clone(m.info) if m.info is not None else None,
        )

    def trace_row(self, row_index: int) -> Dict[str, CellTrace]:
        """Convenience method that bundles structural lineage with
        row-level provenance for a single result row.

        Returns one :class:`CellTrace` per output column, pairing the
        column's structural lineage (from ``metadata.info.returns``)
        with the node / relationship bindings (from
        :attr:`provenance`) whose alias matches one of the column's
        references.

        Raises:
            IndexError: If ``row_index`` is out of bounds for
                :attr:`results`.
        """
        rows = self.results
        length = len(rows) if isinstance(rows, list) else 0
        if row_index < 0 or row_index >= length:
            raise IndexError(
                f"Runner.trace_row: row_index {row_index} out of bounds "
                f"(results length={length})"
            )
        row = rows[row_index]
        info = self._metadata.info
        returns = info.returns if (info is not None and info.returns is not None) else {}
        row_prov: Optional[RowProvenance] = (
            self._provenance[row_index]
            if self._provenance is not None and row_index < len(self._provenance)
            else None
        )
        out: Dict[str, CellTrace] = {}
        for column in row.keys():
            lineage_raw = returns.get(column)
            lineage = (
                Runner._clone_column_lineage(lineage_raw)
                if lineage_raw is not None
                else None
            )
            bindings: List[CellBindingTrace] = []
            if row_prov is not None and lineage is not None:
                for ref in lineage.references:
                    if ref.kind == "node":
                        for n in row_prov.nodes:
                            if n.alias == ref.alias:
                                bindings.append(
                                    CellBindingTrace(
                                        reference=ref,
                                        value=Runner._read_node_property(
                                            n, ref.property
                                        ),
                                        node=n,
                                    )
                                )
                    else:
                        for r in row_prov.relationships:
                            if r.alias == ref.alias:
                                bindings.append(
                                    CellBindingTrace(
                                        reference=ref,
                                        value=Runner._read_relationship_property(
                                            r, ref.property
                                        ),
                                        relationship=r,
                                    )
                                )
            out[column] = CellTrace(
                column=column,
                value=row[column],
                lineage=lineage,
                bindings=bindings,
            )
        return out

    def lineage(self) -> LineageReport:
        """One-shot combined lineage and provenance report for the
        entire Runner execution.

        Returns the structural per-column lineage (deep copy of
        ``metadata.info.returns``) alongside one :meth:`trace_row` map
        per result row.  Useful as a single object to hand to a UI,
        dump to a log, or snapshot for debugging.  For per-cell
        lookups during normal flow, :meth:`trace_row` is cheaper.
        """
        rows = self.results if isinstance(self.results, list) else []
        length = len(rows)
        info = self._metadata.info
        returns_raw = (
            info.returns if (info is not None and info.returns is not None) else {}
        )
        columns: Dict[str, ColumnLineage] = {}
        for k, v in returns_raw.items():
            columns[k] = Runner._clone_column_lineage(v)
        rows_out: List[Dict[str, CellTrace]] = []
        for i in range(length):
            rows_out.append(self.trace_row(i))
        return LineageReport(columns=columns, rows=rows_out)

    @staticmethod
    def _clone_column_lineage(lineage: ColumnLineage) -> ColumnLineage:
        return ColumnLineage(
            references=[
                ColumnReference(
                    alias=r.alias,
                    kind=r.kind,
                    labels=list(r.labels),
                    property=r.property,
                )
                for r in lineage.references
            ],
            kind=lineage.kind,
            aggregate=lineage.aggregate,
        )

    @staticmethod
    def _read_node_property(binding: NodeBinding, property_: str) -> Any:
        """Resolve ``binding.property_`` against a captured
        :class:`NodeBinding`.  The built-in ``id`` lives at the top of
        the binding (it's excluded from ``properties``); everything
        else comes from ``properties``.
        """
        if property_ == "id":
            return binding.id
        if binding.properties is None:
            return None
        return binding.properties.get(property_)

    @staticmethod
    def _read_relationship_property(
        binding: RelationshipBinding, property_: str
    ) -> Any:
        """Resolve ``binding.property_`` against a captured
        :class:`RelationshipBinding`.  Returns the value from
        ``hops[0]``: the built-ins ``left_id``, ``right_id``, and
        ``type`` come from the hop itself, while everything else comes
        from ``hops[0].properties``.
        """
        if not binding.hops:
            return None
        first_hop = binding.hops[0]
        if property_ == "left_id":
            return first_hop.left_id
        if property_ == "right_id":
            return first_hop.right_id
        if property_ == "type":
            return first_hop.type
        if first_hop.properties is None:
            return None
        return first_hop.properties.get(property_)
