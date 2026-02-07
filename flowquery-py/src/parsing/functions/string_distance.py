"""String distance function using Levenshtein distance."""

from typing import Any

from .function import Function
from .function_metadata import FunctionDef


def _levenshtein_distance(a: str, b: str) -> float:
    """Compute the normalized Levenshtein distance between two strings.

    The Levenshtein distance is the minimum number of single-character edits
    (insertions, deletions, or substitutions) required to change one string
    into the other. The result is normalized to [0, 1] by dividing by the
    length of the longer string.

    Args:
        a: First string
        b: Second string

    Returns:
        The normalized Levenshtein distance (0 = identical, 1 = completely different)
    """
    m = len(a)
    n = len(b)

    # Both empty strings are identical
    if m == 0 and n == 0:
        return 0.0

    # Create a matrix of size (m+1) x (n+1)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    # Base cases: transforming empty string to/from a prefix
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    # Fill in the rest of the matrix
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,       # deletion
                dp[i][j - 1] + 1,       # insertion
                dp[i - 1][j - 1] + cost  # substitution
            )

    # Normalize by the length of the longer string
    return dp[m][n] / max(m, n)


@FunctionDef({
    "description": (
        "Computes the normalized Levenshtein distance between two strings. "
        "Returns a value in [0, 1] where 0 means identical and 1 means completely different."
    ),
    "category": "scalar",
    "parameters": [
        {"name": "string1", "description": "First string", "type": "string"},
        {"name": "string2", "description": "Second string", "type": "string"}
    ],
    "output": {
        "description": "Normalized Levenshtein distance (0 = identical, 1 = completely different)",
        "type": "number",
        "example": 0.43,
    },
    "examples": [
        "RETURN string_distance('kitten', 'sitting')",
        "WITH 'hello' AS a, 'hallo' AS b RETURN string_distance(a, b)"
    ]
})
class StringDistance(Function):
    """String distance function.

    Computes the normalized Levenshtein distance between two strings.
    Returns a value in [0, 1] where 0 means identical and 1 means completely different.
    """

    def __init__(self) -> None:
        super().__init__("string_distance")
        self._expected_parameter_count = 2

    def value(self) -> Any:
        str1 = self.get_children()[0].value()
        str2 = self.get_children()[1].value()
        if not isinstance(str1, str) or not isinstance(str2, str):
            raise ValueError("Invalid arguments for string_distance function: both arguments must be strings")
        return _levenshtein_distance(str1, str2)
