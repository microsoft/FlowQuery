"""Data class for graph record iteration and indexing."""

from typing import Any, Dict, List, Optional


class IndexEntry:
    """Index entry for tracking positions of records with a specific key value."""

    def __init__(self, positions: Optional[List[int]] = None):
        self._positions: List[int] = positions if positions is not None else []
        self._index: int = -1

    def add(self, position: int) -> None:
        """Add a position to the index entry."""
        self._positions.append(position)

    @property
    def position(self) -> int:
        """Get the current position."""
        return self._positions[self._index]

    def reset(self) -> None:
        """Reset the index to the beginning."""
        self._index = -1

    def next(self) -> bool:
        """Move to the next position. Returns True if successful."""
        if self._index < len(self._positions) - 1:
            self._index += 1
            return True
        return False

    def clone(self) -> "IndexEntry":
        """Create a copy of this index entry."""
        return IndexEntry(list(self._positions))


class Layer:
    """Layer for managing index state at a specific level."""

    def __init__(self, index: Dict[str, IndexEntry]):
        self._index: Dict[str, IndexEntry] = index
        self._current: int = -1

    @property
    def index(self) -> Dict[str, IndexEntry]:
        """Get the index dictionary."""
        return self._index

    @property
    def current(self) -> int:
        """Get the current position."""
        return self._current

    @current.setter
    def current(self, value: int) -> None:
        """Set the current position."""
        self._current = value


class Data:
    """Base class for graph data with record iteration and indexing."""

    def __init__(self, records: Optional[List[Dict[str, Any]]] = None):
        self._records: List[Dict[str, Any]] = records if records is not None else []
        self._layers: Dict[int, Layer] = {0: Layer({})}

    def _build_index(self, key: str, level: int = 0) -> None:
        """Build an index for the given key at the specified level."""
        self.layer(level).index.clear()
        for idx, record in enumerate(self._records):
            if key in record:
                if record[key] not in self.layer(level).index:
                    self.layer(level).index[record[key]] = IndexEntry()
                self.layer(level).index[record[key]].add(idx)

    def layer(self, level: int = 0) -> Layer:
        """Get or create a layer at the specified level."""
        if level not in self._layers:
            first = self._layers[0]
            cloned = {}
            for key, entry in first.index.items():
                cloned[key] = entry.clone()
            self._layers[level] = Layer(cloned)
        return self._layers[level]

    def _find(self, key: str, level: int = 0) -> bool:
        """Find the next record with the given key value."""
        if key not in self.layer(level).index:
            self.layer(level).current = len(self._records)  # Move to end
            return False
        else:
            entry = self.layer(level).index[key]
            more = entry.next()
            if not more:
                self.layer(level).current = len(self._records)  # Move to end
                return False
            self.layer(level).current = entry.position
            return True

    def reset(self) -> None:
        """Reset iteration to the beginning."""
        for layer in self._layers.values():
            layer.current = -1
            for entry in layer.index.values():
                entry.reset()

    def next(self, level: int = 0) -> bool:
        """Move to the next record. Returns True if successful."""
        if self.layer(level).current < len(self._records) - 1:
            self.layer(level).current += 1
            return True
        return False

    def current(self, level: int = 0) -> Optional[Dict[str, Any]]:
        """Get the current record."""
        if self.layer(level).current < len(self._records):
            return self._records[self.layer(level).current]
        return None
