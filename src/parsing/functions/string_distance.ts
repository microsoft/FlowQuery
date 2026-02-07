import Function from "./function";
import { FunctionDef } from "./function_metadata";

/**
 * Computes the normalized Levenshtein distance between two strings.
 * The Levenshtein distance is the minimum number of single-character edits
 * (insertions, deletions, or substitutions) required to change one string into the other.
 * The result is normalized to [0, 1] by dividing by the length of the longer string.
 *
 * @param a - First string
 * @param b - Second string
 * @returns The normalized Levenshtein distance (0 = identical, 1 = completely different)
 */
function levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;

    // Both empty strings are identical
    if (m === 0 && n === 0) return 0;

    // Create a matrix of size (m+1) x (n+1)
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    // Base cases: transforming empty string to/from a prefix
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Fill in the rest of the matrix
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1, // deletion
                dp[i][j - 1] + 1, // insertion
                dp[i - 1][j - 1] + cost // substitution
            );
        }
    }

    // Normalize by the length of the longer string
    return dp[m][n] / Math.max(m, n);
}

@FunctionDef({
    description:
        "Computes the normalized Levenshtein distance between two strings. Returns a value in [0, 1] where 0 means identical and 1 means completely different.",
    category: "scalar",
    parameters: [
        { name: "string1", description: "First string", type: "string" },
        { name: "string2", description: "Second string", type: "string" },
    ],
    output: {
        description: "Normalized Levenshtein distance (0 = identical, 1 = completely different)",
        type: "number",
        example: 0.43,
    },
    examples: [
        "RETURN string_distance('kitten', 'sitting')",
        "WITH 'hello' AS a, 'hallo' AS b RETURN string_distance(a, b)",
    ],
})
class StringDistance extends Function {
    constructor() {
        super("string_distance");
        this._expectedParameterCount = 2;
    }

    public value(): any {
        const str1 = this.getChildren()[0].value();
        const str2 = this.getChildren()[1].value();
        if (typeof str1 !== "string" || typeof str2 !== "string") {
            throw new Error(
                "Invalid arguments for string_distance function: both arguments must be strings"
            );
        }
        return levenshteinDistance(str1, str2);
    }
}

export default StringDistance;
