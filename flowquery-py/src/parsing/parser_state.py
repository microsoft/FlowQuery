from typing import Dict, List, Optional

from .ast_node import ASTNode
from .context import Context
from .expressions.expression import Expression


class ParserState:
    """Mutable parser state shared across operation parsers.

    Two scope concepts are tracked:

    - ``variables`` is the *current* scope.  It is updated in place as the
      parser walks forward (MATCH binds nodes/relationships, UNWIND binds
      its alias, RETURN/WITH register projection aliases, etc.).
    - ``input_scope`` is an optional snapshot of ``variables`` taken at
      the start of a RETURN/WITH clause, *before* its projection aliases
      are registered.  It is consulted by :meth:`resolve` so that
      trailing modifiers attached to that clause (ORDER BY / WHERE /
      LIMIT) can still see the pre-projection bindings — making
      references such as ``ORDER BY peer.name`` after
      ``RETURN peer.name AS peer`` resolve to the matched node rather
      than the projected scalar.
    """

    def __init__(self) -> None:
        self._variables: Dict[str, ASTNode] = {}
        self._variable_stack: List[Dict[str, ASTNode]] = []
        self._input_scope: Optional[Dict[str, ASTNode]] = None
        self._context = Context()
        self._returns = 0
        self._in_virtual_definition = False

    @property
    def in_virtual_definition(self) -> bool:
        return self._in_virtual_definition

    @in_virtual_definition.setter
    def in_virtual_definition(self, value: bool) -> None:
        self._in_virtual_definition = value

    @property
    def variables(self) -> Dict[str, ASTNode]:
        return self._variables

    def push_variable_scope(self) -> None:
        """Save the current variable scope onto a stack and start a child
        scope that inherits the outer bindings.  Mutations made in the
        child scope (typically registering a single block-local name) do
        not leak back to the outer scope when :meth:`pop_variable_scope`
        is called.  Used for syntactic blocks that introduce their own
        binding — list comprehensions, predicate-function bodies, etc.
        """
        self._variable_stack.append(self._variables)
        self._variables = dict(self._variables)

    def pop_variable_scope(self) -> None:
        """Restore the variable scope previously pushed by
        :meth:`push_variable_scope`."""
        if not self._variable_stack:
            raise RuntimeError("pop_variable_scope without matching push_variable_scope")
        self._variables = self._variable_stack.pop()

    def inherit_variables_from(self, other: "ParserState") -> None:
        """Seed the current variable scope with the bindings of another
        parser state.  Used when entering a subquery expression: the
        subquery gets its own fresh state (with independent returns
        counter, aggregate context, input-scope snapshot, etc.) but
        still needs to see the outer query's variable bindings."""
        self._variables.update(other._variables)

    @property
    def input_scope(self) -> Optional[Dict[str, ASTNode]]:
        return self._input_scope

    def take_input_scope_snapshot(self) -> None:
        """Capture the current variable scope as the clause input scope.

        Called by RETURN/WITH parsers immediately before their projection
        expressions are registered, so that ``input_scope`` reflects what
        was visible *before* the projections introduced any aliases.
        """
        self._input_scope = dict(self._variables)

    def clear_input_scope(self) -> None:
        """Drop the clause input snapshot.  Called once a clause's
        trailing modifiers (ORDER BY / WHERE / LIMIT) have been parsed."""
        self._input_scope = None

    def resolve(self, identifier: str, property_access: bool = False) -> Optional[ASTNode]:
        """Resolve an identifier reference during expression parsing.

        The current (output) scope wins by default — this is what makes
        post-aggregation references such as ``WHERE i = 1`` after
        ``RETURN i, sum(j) AS sum`` see the grouped value through the
        projection's override mechanism.

        When the reference is followed by a property or index access
        (``property_access`` is ``True``) and an input-scope snapshot is
        active, the input binding is preferred whenever the current
        binding is a projection alias (``Expression``) while the input
        bound the same name to a graph entity (Node / Relationship /
        Pattern / Unwind / Load — anything that is not itself an
        ``Expression``).  This makes ``ORDER BY peer.name`` after
        ``RETURN peer.name AS peer`` reach the matched node rather than
        crashing on subscripting the projected string.
        """
        current = self._variables.get(identifier)
        if (
            property_access
            and self._input_scope is not None
            and isinstance(current, Expression)
        ):
            inherited = self._input_scope.get(identifier)
            if inherited is not None and not isinstance(inherited, Expression):
                return inherited
        return current

    @property
    def context(self) -> Context:
        return self._context

    @property
    def returns(self) -> int:
        return self._returns

    def increment_returns(self) -> None:
        self._returns += 1
