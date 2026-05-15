"""Represents a LOAD operation that fetches data from external sources."""

import json
from pathlib import Path
from typing import Any, Dict, Optional

import aiohttp

from ...compute.provenance import (
    DataSourceBinding,
    ProvenanceSource,
    RowSegment,
)
from ...graph.virtual_sources import get_virtual_source
from ..ast_node import ASTNode
from ..components.headers import Headers
from ..components.json import JSON as JSONComponent
from ..components.post import Post
from ..components.text import Text
from ..expressions.binding_reference import BindingReference
from ..functions.async_function import AsyncFunction
from .operation import Operation


class Load(Operation):
    """Represents a LOAD operation that fetches data from external sources."""

    def __init__(self) -> None:
        super().__init__()
        self._value: Any = None

    @property
    def type(self) -> ASTNode:
        """Gets the data type (JSON, CSV, or Text)."""
        return self.children[0]

    @property
    def from_component(self) -> ASTNode:
        """Gets the From component which contains either a URL expression or an AsyncFunction."""
        return self.children[1]

    @property
    def is_async_function(self) -> bool:
        """Checks if the data source is an async function."""
        return isinstance(self.from_component.first_child(), AsyncFunction)

    @property
    def async_function(self) -> Optional[AsyncFunction]:
        """Gets the async function if the source is a function, otherwise None."""
        child = self.from_component.first_child()
        return child if isinstance(child, AsyncFunction) else None

    @property
    def from_(self) -> Any:
        return self.children[1].value()

    @property
    def headers(self) -> Dict[str, str]:
        if self.child_count() > 2 and isinstance(self.children[2], Headers):
            return self.children[2].value() or {}
        return {}

    @property
    def payload(self) -> Optional[ASTNode]:
        post = None
        if self.child_count() > 2 and isinstance(self.children[2], Post):
            post = self.children[2]
        elif self.child_count() > 3 and isinstance(self.children[3], Post):
            post = self.children[3]
        return post.first_child() if post else None

    def _method(self) -> str:
        return "GET" if self.payload is None else "POST"

    def _options(self) -> Dict[str, Any]:
        headers = dict(self.headers)
        payload = self.payload
        data = payload.value() if payload else None
        if data is not None and isinstance(data, dict) and "Content-Type" not in headers:
            headers["Content-Type"] = "application/json"
        options: Dict[str, Any] = {
            "method": self._method(),
            "headers": headers,
        }
        if payload is not None:
            options["body"] = json.dumps(payload.value())
        return options

    @property
    def is_file_uri(self) -> bool:
        """Checks if the source is a local file URI (file:// protocol)."""
        if self.is_async_function:
            return False
        return isinstance(self.from_, str) and self.from_.startswith("file://")

    async def _emit(self, data: Any) -> None:
        """Emits a value or each item of a list to downstream operations."""
        if isinstance(data, list):
            for item in data:
                self._value = item
                if self.next:
                    await self.next.run()
        elif isinstance(data, dict):
            self._value = data
            if self.next:
                await self.next.run()
        elif isinstance(data, str):
            self._value = data
            if self.next:
                await self.next.run()
        elif data is not None:
            self._value = data
            if self.next:
                await self.next.run()

    async def _load_from_file(self) -> None:
        """Loads data from a local file (file:// protocol)."""
        file_path = self.from_.removeprefix("file://")
        content = Path(file_path).read_text(encoding="utf-8")
        if isinstance(self.type, JSONComponent):
            data: Any = json.loads(content)
        else:
            data = content
        await self._emit(data)

    async def _load_from_value(self, data: Any) -> None:
        """Loads data from an already-resolved value (e.g. a LET binding)."""
        await self._emit(data)

    async def _load_from_function(self) -> None:
        """Loads data from an async function source."""
        async_func = self.async_function
        if async_func is None:
            return
        args = async_func.get_arguments()
        async for item in async_func.generate(*args):
            self._value = item
            if self.next:
                await self.next.run()

    async def _load_from_url(self) -> None:
        """Loads data from a URL source."""
        async with aiohttp.ClientSession() as session:
            options = self._options()
            method = options.pop("method")
            headers = options.pop("headers", {})
            body = options.pop("body", None)

            # Set Accept-Encoding to support common compression formats
            # Note: brotli (br) is excluded due to API incompatibility between
            # aiohttp 3.13+ and the brotli package's Decompressor.decompress() method
            if "Accept-Encoding" not in headers:
                headers["Accept-Encoding"] = "gzip, deflate"

            async with session.request(
                method,
                self.from_,
                headers=headers,
                data=body
            ) as response:
                if isinstance(self.type, JSONComponent):
                    data = await response.json()
                elif isinstance(self.type, Text):
                    data = await response.text()
                else:
                    data = await response.text()
                await self._emit(data)

    async def load(self) -> None:
        if self.is_async_function:
            await self._load_from_function()
            return
        source = self.from_
        if isinstance(source, str):
            if source.startswith("file://"):
                await self._load_from_file()
            else:
                await self._load_from_url()
        else:
            await self._load_from_value(source)

    async def run(self) -> None:
        try:
            await self.load()
        except Exception as e:
            async_func = self.async_function
            source = async_func.name if async_func else self.from_
            raise RuntimeError(f"Failed to load data from {source}. Error: {e}")

    def value(self) -> Any:
        return self._value

    def resolve_source_label(self) -> Optional[str]:
        """Returns the lineage-friendly identifier for this LOAD's
        data source.

        Mirrors the TS ``resolveSourceLabel``:

        * async-function source -> the function's ``name``;
        * a ``BindingReference`` (LET-bound) source -> ``let://<name>``,
          even when wrapped one level deep inside an ``Expression``;
        * any string source -> the string itself.

        Returns ``None`` when no stable identifier is available (rare;
        only when ``from_`` is a non-string runtime value with no
        binding wrapper).
        """
        async_func = self.async_function
        if async_func is not None:
            return async_func.name
        from_component = self.from_component
        first = from_component.first_child() if from_component else None
        if isinstance(first, BindingReference):
            return f"let://{first.name}"
        # Parser stores `LOAD JSON FROM <name>` as Expression(BindingReference)
        if first is not None and hasattr(first, "first_child"):
            inner = first.first_child()
            if isinstance(inner, BindingReference):
                return f"let://{inner.name}"
        src = self.from_
        if isinstance(src, str):
            return src
        return None

    def as_provenance_source(self) -> ProvenanceSource:
        """Returns a :class:`ProvenanceSource` whose snapshot describes
        this LOAD's contribution to the row currently being projected.

        The snapshot's ``data_sources`` always contains exactly one
        :class:`DataSourceBinding`. ``source_provenance`` is populated
        from :func:`get_virtual_source` so a ``LOAD JSON FROM <let>``
        threads the inner-runner provenance through to the outer row.
        """
        owner = self
        capture_label = self.resolve_source_label() or ""

        class _LoadSource(ProvenanceSource):
            def snapshot(self) -> RowSegment:
                current = owner._value
                source_prov = get_virtual_source(current)
                binding = DataSourceBinding(source=capture_label)
                if source_prov is not None:
                    binding.source_provenance = source_prov
                return RowSegment(
                    nodes=[],
                    relationships=[],
                    data_sources=[binding],
                )

        return _LoadSource()
