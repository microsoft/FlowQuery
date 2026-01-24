"""Interactive command-line interface for FlowQuery."""

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
    """

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
    """Entry point for the flowquery CLI command."""
    CommandLine().loop()
