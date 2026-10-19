"""Executes a FlowQuery statement and retrieves the results."""

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

from ..graph.bindings import Bindings
from ..graph.data_cache import DataCache
from ..graph.data_resolver import DataResolver
from ..graph.database import Database
from ..graph.node import Node as GraphNode
from ..graph.pattern import Pattern
from ..graph.relationship import Relationship as GraphRelationship
from ..graph.source_context import SourceContext, SourceOptions, empty_source_stats
from ..graph.write_set import WriteResult, replace_refs
from ..parsing.ast_node import ASTNode
from ..parsing.expressions.binding_reference import BindingReference
from ..parsing.expressions.parameter_reference import ParameterReference
from ..parsing.expressions.subquery_expression import SubqueryExpression
from ..parsing.functions.async_function import AsyncFunction
from ..parsing.operations.aggregated_with import AggregatedWith
from ..parsing.operations.create_node import CreateNode
from ..parsing.operations.create_relationship import CreateRelationship
from ..parsing.operations.definition_backend import references_request
from ..parsing.operations.delete_node import DeleteNode
from ..parsing.operations.delete_relationship import DeleteRelationship
from ..parsing.operations.load import Load
from ..parsing.operations.match import Match
from ..parsing.operations.operation import Operation
from ..parsing.operations.return_op import Return
from ..parsing.operations.union import Union
from ..parsing.operations.use_graph import DropGraph, UseGraph
from ..parsing.operations.write import (
    WriteOperation,
    commit_writes,
    flush_writes,
    prepare_writes,
    rollback_writes,
)
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
    #: Tuning for backend-aware virtual sources registered with
    #: ``register_node_source`` / ``register_relationship_source`` or opted
    #: in with ``set_node_source_capabilities`` /
    #: ``set_relationship_source_capabilities`` (page size, batch size,
    #: cache capacity, start-point reordering and an external cancellation
    #: ``signal``).  Ignored by legacy definitions.
    sources: Optional[SourceOptions] = None
    #: Named query parameters.  In a top-level query ``$name`` resolves to
    #: ``parameters[name]`` (a missing value is an error when the query
    #: runs).  Inside virtual definitions ``$args`` and ``$request`` keep
    #: their meaning and other names fall back to these parameters.
    parameters: Optional[Dict[str, Any]] = None
    #: Internal: receives every row emitted by the final RETURN.
    row_sink: Optional[Callable[[Dict[str, Any]], Any]] = field(default=None, repr=False)
    #: Internal: source context inherited by statement-backed sources.
    inner_source_context: Optional[SourceContext] = field(default=None, repr=False)


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
        self._source_context: Optional[SourceContext] = None
        self._cancel_requested = False
        self._write_result: Optional[WriteResult] = None
        self._committed_results: Optional[List[Dict[str, Any]]] = None

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
            QueryCancelledError: If the run was cancelled
        """
        resolver = DataResolver.get_instance()
        inherited = self._options.inner_source_context
        previous_context = resolver.source_context
        sink = self._options.row_sink
        last = self._statements[-1].last if self._statements else None
        failed = False
        self._write_result = None
        self._committed_results = None
        try:
            await self._run_statements(resolver, inherited, previous_context, sink, last)
        except BaseException:
            failed = True
            ctx = self._source_context if self._is_top_level else None
            if ctx is not None and ctx.writes is not None:
                await rollback_writes(ctx, ctx.writes)
            raise
        finally:
            if sink is not None and isinstance(last, Return):
                last.set_row_sink(None)
            resolver.source_context = previous_context
            if self._is_top_level and self._source_context is not None:
                try:
                    await self._source_context.close()
                except Exception:
                    if not failed:
                        raise

    def cancel(self) -> None:
        """Cancel a running (or not yet started) query.

        In-flight provider reads are aborted and :meth:`run` raises
        :class:`QueryCancelledError`.
        """
        self._cancel_requested = True
        if self._is_top_level and self._source_context is not None:
            self._source_context.cancel()

    @property
    def source_stats(self) -> Dict[str, Any]:
        """Provider interaction counters of the last top-level run.

        Keys: ``calls`` (``scan``/``lookup``/``expand``), ``pages``,
        ``rows``, ``cacheHits``, ``cacheMisses``, ``batches``,
        ``materializations``, ``fallbacks``, ``cancellations``,
        ``peakBufferedRows`` and ``plans``.
        """
        if self._source_context is not None:
            return self._source_context.stats
        return empty_source_stats()

    @staticmethod
    def _assign_source_context(node: ASTNode, ctx: Optional[SourceContext]) -> None:
        if isinstance(node, (Match, AsyncFunction, WriteOperation, UseGraph, DropGraph)):
            node.source_context = ctx
        for child in node.get_children():
            Runner._assign_source_context(child, ctx)

    async def _commit_writes(self) -> None:
        """Finish the query's writes: send the remaining changes (the whole
        change set, in one call, for non-transactional backends), commit a
        transactional query, then replace temporary refs in the results by
        final ids.  Only runs when every statement succeeded and the query
        was not cancelled."""
        ctx = self._source_context
        if not self._is_top_level or ctx is None or ctx.writes is None:
            return
        writes = ctx.writes
        if len(writes.changes) == 0 or writes.backend is None:
            return
        self._write_result = await commit_writes(ctx, writes)
        # Aggregating projections rebuild their rows on every read, so keep
        # the rows whose temporary refs were replaced.
        self._committed_results = replace_refs(self.results, self._write_result.ids, writes.refs)

    @property
    def write_result(self) -> Optional[WriteResult]:
        """Outcome of the last run's write clauses: the change set sent to
        the backend, the final ids of temporary refs and the backend's stats.
        ``None`` when the query wrote nothing."""
        return self._write_result

    async def _run_statements(
        self,
        resolver: DataResolver,
        inherited: Optional[SourceContext],
        previous_context: Optional[SourceContext],
        sink: Optional[Callable[[Dict[str, Any]], Any]],
        last: Optional[Operation],
    ) -> None:
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
            self._source_context = SourceContext(
                self._options.sources or SourceOptions(),
                self._options.provenance is True,
            )
            self._source_context.parameters = dict(self._options.parameters or {})
            # Pin the default graph for the whole query.
            self._source_context.graph = Database.get_instance().default_graph
            resolver.data_cache = DataCache(
                provenance=self._options.provenance,
                source_context=self._source_context,
            )
        else:
            self._source_context = inherited or previous_context
        if self._cancel_requested and self._source_context is not None:
            self._source_context.cancel()
        resolver.source_context = self._source_context
        if self._options.provenance:
            self._provenance = []
            self._enable_provenance()
        if sink is not None and isinstance(last, Return):
            last.set_row_sink(sink)
        bindings_singleton = Bindings.get_instance()
        for stmt in self._statements:
            if self._source_context is not None:
                self._source_context.throw_if_cancelled()
            Runner._assign_source_context(stmt.ast, self._source_context)
            self._bind_parameters(stmt.ast)
            # Refresh any stale refreshable bindings referenced by
            # this statement.  Sub-query evaluation is async but
            # BindingReference.value() is sync, so the cache must be
            # populated up-front.
            names: set[str] = set()
            self._collect_binding_names(stmt.ast, names)
            for name in names:
                await bindings_singleton.materialize(name)
            writes = WriteOperation.collect(stmt.first)
            if len(writes) > 0:
                if not self._is_top_level or self._source_context is None:
                    raise ValueError("Write clauses are only allowed in top-level queries")
                prepare_writes(stmt.first, self._source_context)
            await stmt.first.initialize()
            await stmt.first.run()
            await stmt.first.finish()
            # Transactional backends get each statement's changes before
            # the next statement reads.
            ctx = self._source_context
            pending = ctx.writes if ctx is not None else None
            if (
                self._is_top_level
                and ctx is not None
                and pending is not None
                and pending.transactional
                and pending.backend is not None
            ):
                await flush_writes(ctx, pending)
        await self._commit_writes()

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
        """Recursively walks the AST to bind ParameterReference nodes.

        Inside virtual definitions ``$args`` resolves to the pass-down args
        map, ``$request`` to the source request and ``$name`` to
        ``args[name]``, falling back to the enclosing query's parameters.
        Elsewhere ``$name`` resolves from ``RunnerOptions.parameters``
        (inherited by nested sub-query runners); a missing value is an
        error.
        """
        if isinstance(node, UseGraph):
            # `$request` is a placeholder filled per backend request.
            for child in node.function.get_children():
                if not references_request(child):
                    self._bind_parameters(child)
            return
        if isinstance(node, ParameterReference):
            node.parameter_value = self._resolve_parameter(node)
        for child in node.get_children():
            self._bind_parameters(child)
        for child in Runner._off_tree_children(node):
            self._bind_parameters(child)

    @staticmethod
    def _off_tree_children(node: ASTNode) -> List[ASTNode]:
        """AST nodes evaluated with the statement but held outside the
        child list: MATCH patterns, pattern elements, their property
        constraints and sub-query bodies."""
        if isinstance(node, Match):
            return list(node.patterns)
        if isinstance(node, Pattern):
            return list(node.chain)
        if isinstance(node, (GraphNode, GraphRelationship)):
            return [v for v in node.properties.values() if isinstance(v, ASTNode)]
        if isinstance(node, SubqueryExpression):
            return [node.subquery]
        if isinstance(node, WriteOperation):
            return node.evaluated
        return []

    def _resolve_parameter(self, ref: ParameterReference) -> Any:
        key = ref.name[1:] if ref.name.startswith("$") else ref.name
        parameters = self._options.parameters
        if parameters is not None and key in parameters:
            return parameters[key]
        query_parameters: Optional[Dict[str, Any]] = None
        if not self._is_top_level and self._source_context is not None:
            query_parameters = self._source_context.parameters
        if ref.in_virtual_definition:
            args = self._args or {}
            if key == "args":
                return args
            if key in args:
                return args[key]
            if query_parameters is not None and key in query_parameters:
                return query_parameters[key]
            return None
        if query_parameters is not None and key in query_parameters:
            return query_parameters[key]
        if self._args is not None and key in self._args:
            return self._args[key]
        if key in ("args", "request"):
            raise ValueError(
                f"Parameter ${key} is only available inside virtual node or relationship definitions"
            )
        raise ValueError(f"Missing value for parameter ${key}")

    @property
    def results(self) -> List[Dict[str, Any]]:
        """Gets the results from the executed statement.

        Returns:
            The results from the last operation (typically a RETURN statement)
        """
        if self._committed_results is not None:
            return self._committed_results
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
