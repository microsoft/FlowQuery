"""Executes a FlowQuery statement and retrieves the results."""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from ..graph.bindings import Bindings
from ..graph.data_cache import DataCache
from ..graph.data_resolver import DataResolver
from ..parsing.ast_node import ASTNode
from ..parsing.expressions.binding_reference import BindingReference
from ..parsing.expressions.parameter_reference import ParameterReference
from ..parsing.operations.create_node import CreateNode
from ..parsing.operations.create_relationship import CreateRelationship
from ..parsing.operations.delete_node import DeleteNode
from ..parsing.operations.delete_relationship import DeleteRelationship
from ..parsing.operations.operation import Operation
from ..parsing.parser import Parser
from ..parsing.statement_info_crawler import StatementInfo, StatementInfoCrawler


@dataclass
class RunnerMetadata:
    """Metadata about the operations performed by a Runner execution.

    The four counters track CREATE/DELETE VIRTUAL operations. The optional
    :attr:`info` field carries deeper structural information about the
    statement(s) — labels, relationship types, sources, and properties —
    produced by :class:`~..parsing.statement_info_crawler.StatementInfoCrawler`.
    """

    virtual_nodes_created: int = 0
    virtual_relationships_created: int = 0
    virtual_nodes_deleted: int = 0
    virtual_relationships_deleted: int = 0
    info: Optional[StatementInfo] = field(default=None)


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
    ):
        """Creates a new Runner instance and parses the FlowQuery statement.

        Args:
            statement: The FlowQuery statement to execute (may contain semicolon-separated statements)
            ast: An already-parsed AST (optional)
            args: Optional parameters to inject into $-prefixed parameter references

        Raises:
            ValueError: If neither statement nor AST is provided
        """
        if (statement is None or statement == "") and ast is None:
            raise ValueError("Either statement or AST must be provided")

        self._args = args

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
            DataResolver.get_instance().data_cache = DataCache()
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
