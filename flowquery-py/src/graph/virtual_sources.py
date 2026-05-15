"""Module-level back-reference from a virtual node / relationship record
(or relationship match dict) to the inner-runner :class:`RowProvenance`
that produced it.

Used by deep-mode provenance to thread lineage from a ``CREATE VIRTUAL
(:X) AS { ... }`` sub-query into the outer query's row-level bindings,
and to thread lineage from a ``LET`` sub-query into a downstream
``LOAD JSON FROM <letName>`` consumer.

Decoupled from :mod:`compute.provenance` to keep the graph layer free
of compute imports - the value is typed as :class:`Any` here and
re-cast by the snapshot code that consumes it.

Python-specific note: plain ``dict`` records do not support
:mod:`weakref`, so this module keys by :func:`id`. Top-level
:class:`Runner.run` clears the registry on entry to bound the
lifetime to a single outer query (recursion stays safe because the
inner runner re-attaches its own records).
"""

from __future__ import annotations

from typing import Any, Dict, Optional

_virtual_sources: Dict[int, Any] = {}


def attach_virtual_source(record: Any, prov: Any) -> None:
    """Register a virtual-sourced record with its inner provenance row."""
    if record is None:
        return
    _virtual_sources[id(record)] = prov


def get_virtual_source(record: Optional[Any]) -> Any:
    """Look up the inner provenance for a record / match object.

    Returns ``None`` if the value did not originate from a deep-mode
    virtual or LET sub-query.
    """
    if record is None:
        return None
    return _virtual_sources.get(id(record))


def clear_virtual_sources() -> None:
    """Drop every registered virtual-source mapping.

    Called by the top-level :class:`Runner.run` on entry so the
    map is bounded to the lifetime of a single outer query.
    """
    _virtual_sources.clear()
