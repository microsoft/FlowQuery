#!/usr/bin/env python
"""FlowQuery command-line entry point.

Run with: python -m src
"""

from . import CommandLine

if __name__ == "__main__":
    CommandLine().loop()
