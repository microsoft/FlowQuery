# FlowQuery

A declarative query language for data processing pipelines.

## Installation

```bash
pip install flowquery
```

## Quick Start

### Command Line Interface

Start the interactive REPL:

```bash
flowquery
```

### Programmatic Usage

```python
import asyncio
from flowquery import Runner

runner = Runner("WITH 1 as x RETURN x + 1 as result")
asyncio.run(runner.run())
print(runner.results)  # [{'result': 2}]
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

## Documentation

- [Full Documentation](https://github.com/microsoft/FlowQuery)
- [Contributing Guide](https://github.com/microsoft/FlowQuery/blob/main/flowquery-py/CONTRIBUTING.md)

## License

MIT License - see [LICENSE](https://github.com/microsoft/FlowQuery/blob/main/LICENSE) for details.

## Links

- [Homepage](https://github.com/microsoft/FlowQuery)
- [Repository](https://github.com/microsoft/FlowQuery)
- [Issues](https://github.com/microsoft/FlowQuery/issues)
