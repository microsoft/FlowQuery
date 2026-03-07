import { StreamLanguage, StringStream } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const keywords = new Set([
    "match",
    "return",
    "where",
    "with",
    "create",
    "merge",
    "delete",
    "set",
    "remove",
    "unwind",
    "call",
    "foreach",
    "union",
    "optional",
    "virtual",
    "detach",
    "distinct",
    "all",
    "yield",
    "load",
    "from",
    "csv",
    "json",
    "text",
    "headers",
    "post",
    "as",
    "order",
    "by",
    "asc",
    "desc",
    "skip",
    "limit",
    "case",
    "when",
    "then",
    "else",
    "end",
]);

const operators = new Set(["and", "or", "not", "in", "is", "contains", "starts", "ends"]);

const builtins = new Set([
    "avg",
    "collect",
    "count",
    "max",
    "min",
    "sum",
    "coalesce",
    "date",
    "datetime",
    "duration",
    "elementid",
    "functions",
    "head",
    "id",
    "join",
    "keys",
    "last",
    "localdatetime",
    "localtime",
    "nodes",
    "properties",
    "rand",
    "range",
    "relationships",
    "replace",
    "round",
    "size",
    "split",
    "string_distance",
    "stringify",
    "substring",
    "tail",
    "time",
    "timestamp",
    "tofloat",
    "tointeger",
    "tojson",
    "tolower",
    "tostring",
    "trim",
    "type",
    "schema",
]);

const cypherStreamParser = {
    startState: () => ({ blockComment: false }),
    token(stream: StringStream, state: { blockComment: boolean }): string | null {
        // Handle block comment continuation
        if (state.blockComment) {
            while (!stream.eol()) {
                if (stream.match("*/")) {
                    state.blockComment = false;
                    return "blockComment";
                }
                stream.next();
            }
            return "blockComment";
        }

        if (stream.eatSpace()) return null;

        // Single-line comment
        if (stream.match("//")) {
            stream.skipToEnd();
            return "lineComment";
        }

        // Block comment start
        if (stream.match("/*")) {
            while (!stream.eol()) {
                if (stream.match("*/")) return "blockComment";
                stream.next();
            }
            state.blockComment = true;
            return "blockComment";
        }

        // F-string
        if (stream.match(/^f"/)) {
            while (!stream.eol()) {
                const ch = stream.next();
                if (ch === "\\") {
                    stream.next();
                    continue;
                }
                if (ch === '"') return "string";
            }
            return "string";
        }

        // Strings
        if (stream.match(/^'/)) {
            while (!stream.eol()) {
                const ch = stream.next();
                if (ch === "\\") {
                    stream.next();
                    continue;
                }
                if (ch === "'") return "string";
            }
            return "string";
        }
        if (stream.match(/^"/)) {
            while (!stream.eol()) {
                const ch = stream.next();
                if (ch === "\\") {
                    stream.next();
                    continue;
                }
                if (ch === '"') return "string";
            }
            return "string";
        }

        // Backtick identifier
        if (stream.match(/^`/)) {
            while (!stream.eol()) {
                if (stream.next() === "`") return "name";
            }
            return "name";
        }

        // Numbers
        if (stream.match(/^-?\d+(\.\d+)?/)) return "number";

        // Multi-char operators
        if (stream.match(/^(<>|<=|>=|->|<-)/)) return "operator";

        // Label/type after colon
        if (stream.match(/^:[A-Za-z_]\w*/)) return "typeName";

        // Words
        if (stream.match(/^[A-Za-z_]\w*/)) {
            const word = stream.current().toLowerCase();
            if (word === "true" || word === "false") return "bool";
            if (word === "null") return "null";
            if (keywords.has(word)) return "keyword";
            if (operators.has(word)) return "operatorKeyword";
            if (builtins.has(word)) return "variableName.standard";
            return "variableName";
        }

        // Single-char operators/symbols
        const ch = stream.next();
        if (ch && "+-*/%^=<>|".includes(ch)) return "operator";
        if (ch && "()[]{},.;".includes(ch)) return "punctuation";

        return null;
    },
    tokenTable: {
        keyword: t.keyword,
        operatorKeyword: t.operatorKeyword,
        "variableName.standard": t.standard(t.variableName),
        variableName: t.variableName,
        string: t.string,
        number: t.number,
        bool: t.bool,
        null: t.null,
        lineComment: t.lineComment,
        blockComment: t.blockComment,
        operator: t.operator,
        punctuation: t.punctuation,
        typeName: t.typeName,
        name: t.name,
    },
};

export const cypherLanguage = StreamLanguage.define(cypherStreamParser);
