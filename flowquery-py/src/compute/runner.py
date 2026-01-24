"""Executes a FlowQuery statement and retrieves the results."""

from typing import Any, Dict, List, Optional

from ..parsing.ast_node import ASTNode
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
        ast: Optional[ASTNode] = None
    ):
        """Creates a new Runner instance and parses the FlowQuery statement.
        
        Args:
            statement: The FlowQuery statement to execute
            ast: An already-parsed AST (optional)
            
        Raises:
            ValueError: If neither statement nor AST is provided
        """
        if (statement is None or statement == "") and ast is None:
            raise ValueError("Either statement or AST must be provided")
        
        _ast = ast if ast is not None else Parser().parse(statement)
        self._first: Operation = _ast.first_child()
        self._last: Operation = _ast.last_child()

    async def run(self) -> None:
        """Executes the parsed FlowQuery statement.
        
        Raises:
            Exception: If an error occurs during execution
        """
        await self._first.initialize()
        await self._first.run()
        await self._first.finish()

    @property
    def results(self) -> List[Dict[str, Any]]:
        """Gets the results from the executed statement.
        
        Returns:
            The results from the last operation (typically a RETURN statement)
        """
        return self._last.results
