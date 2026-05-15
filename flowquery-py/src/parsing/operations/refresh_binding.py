"""REFRESH BINDING operation."""

from typing import Any, List

from ...graph.bindings import Bindings
from .operation import Operation


class RefreshBinding(Operation):
    """``REFRESH BINDING name``: clear the cached value of a
    refreshable binding so the next read re-executes the backing
    sub-query.  No-op for plain bindings.
    """

    def __init__(self, name: str):
        super().__init__()
        self._name = name

    @property
    def name(self) -> str:
        return self._name

    async def run(self) -> None:
        Bindings.get_instance().invalidate(self._name)
        if self.next:
            await self.next.run()

    @property
    def results(self) -> List[Any]:
        return []
