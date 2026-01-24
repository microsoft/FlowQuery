# Contributing to FlowQuery Python

This guide covers setting up a development environment and contributing to the Python implementation of FlowQuery.

## Development Setup

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

### Using Conda (Recommended)

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

## Code Style

- Follow PEP 8 guidelines
- Use type hints where appropriate
- Write docstrings for public APIs

## Submitting Changes

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `pytest tests/`
5. Submit a pull request
