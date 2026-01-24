"""Represents a WITH operation that defines variables or intermediate results."""

from .projection import Projection


class With(Projection):
    """Represents a WITH operation that defines variables or intermediate results.
    
    The WITH operation creates named expressions that can be referenced later in the query.
    It passes control to the next operation in the chain.
    
    Example:
        # WITH x = 1, y = 2 RETURN x + y
    """

    async def run(self) -> None:
        if self.next:
            await self.next.run()
