"""Interactive command-line interface for FlowQuery."""

import argparse
import asyncio
from typing import Optional

from ..compute.runner import Runner


class CommandLine:
    """Interactive command-line interface for FlowQuery.
    
    Provides a REPL (Read-Eval-Print Loop) for executing FlowQuery statements
    and displaying results.
    
    Example:
        cli = CommandLine()
        cli.loop()  # Starts interactive mode
        
        # Or execute a single query:
        cli.execute("load json from 'https://example.com/data' as d return d")
    """

    def execute(self, query: str) -> None:
        """Execute a single FlowQuery statement and print results.
        
        Args:
            query: The FlowQuery statement to execute.
        """
        # Remove the termination semicolon if present
        query = query.strip().rstrip(";")
        
        try:
            runner = Runner(query)
            asyncio.run(self._execute(runner))
        except Exception as e:
            print(f"Error: {e}")

    def loop(self) -> None:
        """Starts the interactive command loop.
        
        Prompts the user for FlowQuery statements, executes them, and displays results.
        Type "exit" to quit the loop. End multi-line queries with ";".
        """
        print('Welcome to FlowQuery! Type "exit" to quit.')
        print('End queries with ";" to execute. Multi-line input supported.')
        
        while True:
            try:
                lines = []
                prompt = "> "
                while True:
                    line = input(prompt)
                    if line.strip() == "exit":
                        print("Exiting FlowQuery.")
                        return
                    lines.append(line)
                    user_input = "\n".join(lines)
                    if user_input.strip().endswith(";"):
                        break
                    prompt = "... "
            except EOFError:
                break
            
            if user_input.strip() == "":
                continue
            
            # Remove the termination semicolon before sending to the engine
            user_input = user_input.strip().rstrip(";")
            
            try:
                runner = Runner(user_input)
                asyncio.run(self._execute(runner))
            except Exception as e:
                print(f"Error: {e}")

        print("Exiting FlowQuery.")

    async def _execute(self, runner: Runner) -> None:
        await runner.run()
        print(runner.results)


def main() -> None:
    """Entry point for the flowquery CLI command.
    
    Usage:
        flowquery              # Start interactive mode
        flowquery -c "query"   # Execute a single query
        flowquery --command "query"
    """
    parser = argparse.ArgumentParser(
        description="FlowQuery - A declarative query language for data processing pipelines",
        prog="flowquery"
    )
    parser.add_argument(
        "-c", "--command",
        type=str,
        metavar="QUERY",
        help="Execute a FlowQuery statement and exit"
    )
    
    args = parser.parse_args()
    cli = CommandLine()
    
    if args.command:
        cli.execute(args.command)
    else:
        cli.loop()
