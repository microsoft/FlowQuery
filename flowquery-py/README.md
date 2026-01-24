# FlowQuery Python Implementation

This is the Python implementation of FlowQuery, a declarative query language for data processing pipelines.

## Installation

### From Source

```bash
git clone https://github.com/microsoft/FlowQuery.git
cd FlowQuery/flowquery-py
pip install -e .
```

### With Development Dependencies

```bash
pip install -e ".[dev]"
```

## Quick Start

### Command Line Interface

After installation, you can start the interactive REPL:

```bash
flowquery
```

### Using Conda (Alternative)

**Windows (PowerShell):**

```powershell
cd flowquery-py
.\setup_env.ps1
conda activate flowquery
```

**Linux/macOS:**

```bash
cd flowquery-py
chmod +x setup_env.sh
./setup_env.sh
conda activate flowquery
```

The setup scripts automatically:

1. Read the Python version from `pyproject.toml`
2. Create a conda environment named `flowquery`
3. Install the package with all dev dependencies

## Requirements

- Python 3.10+ (defined in `pyproject.toml`)
- pytest (for running tests)
- pytest-asyncio (for async test support)
- aiohttp (for HTTP requests)

All dependencies are managed in `pyproject.toml`.

## Programmatic Usage

```python
import asyncio
from flowquery import Runner

runner = Runner("WITH 1 as x RETURN x + 1 as result")
asyncio.run(runner.run())
print(runner.results)  # [{'result': 2}]
```

## Running Tests

```bash
pytest tests/
```

## Project Structure

```
flowquery-py/
├── pyproject.toml       # Dependencies & project config (single source of truth)
├── setup_env.ps1        # Windows conda setup script
├── setup_env.sh         # Linux/macOS conda setup script
├── README.md
├── src/
│   ├── __init__.py          # Main package entry point
│   ├── extensibility.py     # Public API for custom functions
│   ├── compute/
│   │   └── runner.py        # Query execution engine
│   ├── graph/
│   │   ├── node.py          # Graph node representation
│   │   ├── relationship.py  # Graph relationship representation
│   │   ├── pattern.py       # Pattern matching
│   │   └── database.py      # In-memory graph database
│   ├── io/
│   │   └── command_line.py  # Interactive REPL
│   ├── parsing/
│   │   ├── parser.py        # Main parser
│   │   ├── ast_node.py      # AST node base class
│   │   ├── expressions/     # Expression types (numbers, strings, operators)
│   │   ├── functions/       # Built-in and custom functions
│   │   ├── operations/      # Query operations (WITH, RETURN, UNWIND, etc.)
│   │   ├── components/      # LOAD clause components
│   │   ├── data_structures/ # Arrays, objects, lookups
│   │   └── logic/           # CASE/WHEN/THEN/ELSE
│   ├── tokenization/
│   │   ├── tokenizer.py     # Lexer
│   │   ├── token.py         # Token class
│   │   └── ...              # Token types and mappers
│   └── utils/
│       ├── string_utils.py  # String manipulation utilities
│       └── object_utils.py  # Object utilities
└── tests/
    ├── test_extensibility.py
    ├── compute/
    │   └── test_runner.py
    ├── graph/
    │   ├── test_create.py
    │   ├── test_data.py
    │   └── test_match.py
    ├── parsing/
    │   ├── test_parser.py
    │   ├── test_context.py
    │   └── test_expression.py
    └── tokenization/
        ├── test_tokenizer.py
        ├── test_token_mapper.py
        └── test_trie.py
```

## Creating Custom Functions

```python
from flowquery.extensibility import Function, FunctionDef

@FunctionDef({
    "description": "Converts a string to uppercase",
    "category": "string",
    "parameters": [
        {"name": "text", "description": "String to convert", "type": "string"}
    ],
    "output": {"description": "Uppercase string", "type": "string"}
})
class UpperCase(Function):
    def __init__(self):
        super().__init__("uppercase")
        self._expected_parameter_count = 1

    def value(self) -> str:
        return str(self.get_children()[0].value()).upper()
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [Homepage](https://github.com/microsoft/FlowQuery/flowquery-py)
- [Repository](https://github.com/microsoft/FlowQuery/flowquery-py)
- [Issues](https://github.com/microsoft/FlowQuery/issues)
