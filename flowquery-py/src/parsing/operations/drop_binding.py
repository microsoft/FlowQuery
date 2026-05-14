"""DROP BINDING operation."""

from typing import Any, List

from ...graph.bindings import Bindings
from .operation import Operation


class DropBinding(Operation):
    """``DROP BINDING name``: remove a LET-bound entry (STATIC or
    eager) from the :class:`Bindings` singleton.  No-op if the binding
    does not exist.
    """

    def __init__(self, name: str):
        super().__init__()
        self._name = name

    @property
    def name(self) -> str:
        return self._name

    async def run(self) -> None:
        Bindings.get_instance().delete(self._name)
        if self.next:
            await self.next.run()

    @property
    def results(self) -> List[Any]:
        return []
