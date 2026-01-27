"""Represents a LOAD operation that fetches data from external sources."""

import json
from typing import Any, Dict, Optional

from .operation import Operation
from ..functions.async_function import AsyncFunction


class Load(Operation):
    """Represents a LOAD operation that fetches data from external sources."""

    def __init__(self):
        super().__init__()
        self._value: Any = None

    @property
    def type(self):
        """Gets the data type (JSON, CSV, or Text)."""
        return self.children[0]

    @property
    def from_component(self):
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
    def from_(self) -> str:
        return self.children[1].value()

    @property
    def headers(self) -> Dict[str, str]:
        from ..components.headers import Headers
        if self.child_count() > 2 and isinstance(self.children[2], Headers):
            return self.children[2].value() or {}
        return {}

    @property
    def payload(self):
        from ..components.post import Post
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
        import aiohttp
        from ..components.json import JSON as JSONComponent
        from ..components.text import Text
        
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

    async def load(self) -> None:
        if self.is_async_function:
            await self._load_from_function()
        else:
            await self._load_from_url()

    async def run(self) -> None:
        try:
            await self.load()
        except Exception as e:
            source = self.async_function.name if self.is_async_function else self.from_
            raise RuntimeError(f"Failed to load data from {source}. Error: {e}")

    def value(self) -> Any:
        return self._value
