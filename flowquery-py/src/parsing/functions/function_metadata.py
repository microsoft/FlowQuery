"""Function metadata and decorator for FlowQuery functions."""

from typing import Any, Callable, Dict, List, Optional, TypedDict, Union
from dataclasses import dataclass


# Type definitions
FunctionCategory = str  # "scalar" | "aggregate" | "predicate" | "async" | string


class ParameterSchema(TypedDict, total=False):
    """Schema definition for function arguments."""
    name: str
    description: str
    type: str  # "string" | "number" | "boolean" | "object" | "array" | "null"
    required: bool
    default: Any
    items: Dict[str, Any]
    properties: Dict[str, Any]
    enum: List[Any]
    example: Any


class OutputSchema(TypedDict, total=False):
    """Schema definition for function output."""
    description: str
    type: str
    items: Dict[str, Any]
    properties: Dict[str, Any]
    example: Any


@dataclass
class FunctionMetadata:
    """Metadata for a registered function, designed for LLM consumption."""
    name: str
    description: str
    category: FunctionCategory
    parameters: List[ParameterSchema]
    output: OutputSchema
    examples: Optional[List[str]] = None
    notes: Optional[str] = None


class FunctionDefOptions(TypedDict, total=False):
    """Decorator options - metadata without the name (derived from class)."""
    description: str
    category: FunctionCategory
    parameters: List[ParameterSchema]
    output: OutputSchema
    examples: List[str]
    notes: str


class FunctionRegistry:
    """Centralized registry for function metadata, factories, and async providers."""
    
    _metadata: Dict[str, FunctionMetadata] = {}
    _factories: Dict[str, Callable[[], Any]] = {}

    @classmethod
    def register(cls, constructor: type, options: FunctionDefOptions) -> None:
        """Registers a regular function class."""
        instance = constructor()
        display_name = getattr(instance, 'name', constructor.__name__).lower()
        category = options.get('category', '')
        registry_key = f"{display_name}:{category}" if category else display_name

        metadata = FunctionMetadata(
            name=display_name,
            description=options.get('description', ''),
            category=options.get('category', 'scalar'),
            parameters=options.get('parameters', []),
            output=options.get('output', {'description': '', 'type': 'any'}),
            examples=options.get('examples'),
            notes=options.get('notes'),
        )
        cls._metadata[registry_key] = metadata

        if category != 'predicate':
            cls._factories[display_name] = lambda c=constructor: c()
        cls._factories[registry_key] = lambda c=constructor: c()

    @classmethod
    def get_all_metadata(cls) -> List[FunctionMetadata]:
        return list(cls._metadata.values())

    @classmethod
    def get_metadata(cls, name: str, category: Optional[str] = None) -> Optional[FunctionMetadata]:
        lower_name = name.lower()
        if category:
            return cls._metadata.get(f"{lower_name}:{category}")
        for meta in cls._metadata.values():
            if meta.name.lower() == lower_name:
                return meta
        return None

    @classmethod
    def get_factory(cls, name: str, category: Optional[str] = None) -> Optional[Callable[[], Any]]:
        lower_name = name.lower()
        if category:
            return cls._factories.get(f"{lower_name}:{category}")
        return cls._factories.get(lower_name)


def FunctionDef(options: FunctionDefOptions):
    """Class decorator that registers function metadata.
    
    The function name is derived from the class's constructor.
    
    Args:
        options: Function metadata (excluding name)
        
    Returns:
        Class decorator
        
    Example:
        @FunctionDef({
            'description': "Adds two numbers",
            'category': "scalar",
            'parameters': [
                {'name': "a", 'description': "First number", 'type': "number"},
                {'name': "b", 'description': "Second number", 'type': "number"}
            ],
            'output': {'description': "Sum of a and b", 'type': "number"},
        })
        class AddFunction(Function):
            def __init__(self):
                super().__init__("add")
    """
    def decorator(cls: type) -> type:
        FunctionRegistry.register(cls, options)
        return cls
    return decorator


def get_registered_function_metadata() -> List[FunctionMetadata]:
    """Gets all registered function metadata from decorators."""
    return FunctionRegistry.get_all_metadata()


def get_registered_function_factory(name: str, category: Optional[str] = None) -> Optional[Callable[[], Any]]:
    """Gets a registered function factory by name."""
    return FunctionRegistry.get_factory(name, category)


def get_function_metadata(name: str, category: Optional[str] = None) -> Optional[FunctionMetadata]:
    """Gets metadata for a specific function by name."""
    return FunctionRegistry.get_metadata(name, category)
