"""Executes a FlowQuery statement and retrieves the results."""

from typing import Any, Dict, List, Optional

from ..parsing.ast_node import ASTNode
from ..parsing.expressions.parameter_reference import ParameterReference
from ..parsing.operations.operation import Operation
from ..parsing.parser import Parser


class Runner:
    """Executes a FlowQuery statement and retrieves the results.

    The Runner class parses a FlowQuery statement into an AST and executes it,
    managing the execution flow from the first operation to the final return statement.

    Example:
        runner = Runner("WITH 1 as x RETURN x")
        await runner.run()
        print(runner.results)  # [{ x: 1 }]
    """

    def __init__(
        self,
        statement: Optional[str] = None,
        ast: Optional[ASTNode] = None,
        args: Optional[Dict[str, Any]] = None,
    ):
        """Creates a new Runner instance and parses the FlowQuery statement.

        Args:
            statement: The FlowQuery statement to execute
            ast: An already-parsed AST (optional)
            args: Optional parameters to inject into $-prefixed parameter references

        Raises:
            ValueError: If neither statement nor AST is provided
        """
        if (statement is None or statement == "") and ast is None:
            raise ValueError("Either statement or AST must be provided")

        self._ast = ast if ast is not None else Parser().parse(statement or "")
        self._args = args
        first = self._ast.first_child()
        last = self._ast.last_child()
        if not isinstance(first, Operation) or not isinstance(last, Operation):
            raise ValueError("AST must contain Operations")
        self._first: Operation = first
        self._last: Operation = last

    async def run(self) -> None:
        """Executes the parsed FlowQuery statement.

        Raises:
            Exception: If an error occurs during execution
        """
        self._bind_parameters(self._ast)
        await self._first.initialize()
        await self._first.run()
        await self._first.finish()

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
        return self._last.results
