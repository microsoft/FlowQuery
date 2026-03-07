// Cypher keyword dictionary: maps common keywords/phrases to single-byte tokens.
// Uses control chars (0x01–0x1F) that won't appear in query text.
// Ordered longest-first so multi-word phrases are matched before their parts.
const DICTIONARY: [string, string][] = [
    ["OPTIONAL MATCH", "\x01"],
    ["LOAD JSON FROM", "\x03"],
    ["LOAD CSV FROM", "\x04"],
    ["LOAD TEXT FROM", "\x05"],
    ["ORDER BY", "\x06"],
    ["STARTS WITH", "\x07"],
    ["ENDS WITH", "\x08"],
    ["RETURN", "\x0e"],
    ["MATCH", "\x0f"],
    ["WHERE", "\x10"],
    ["CREATE", "\x11"],
    ["UNWIND", "\x12"],
    ["COLLECT", "\x13"],
    ["DELETE", "\x14"],
    ["MERGE", "\x15"],
    ["VIRTUAL", "\x16"],
    ["HEADERS", "\x17"],
    ["DISTINCT", "\x18"],
    ["FOREACH", "\x19"],
    ["CONTAINS", "\x1a"],
    ["LIMIT", "\x1b"],
    ["YIELD", "\x1c"],
    ["UNION", "\x1d"],
    ["WITH", "\x1e"],
    ["CALL", "\x1f"],
];

// Build regex that matches keywords case-insensitively at word boundaries
const ENCODE_REGEX = new RegExp(
    DICTIONARY.map(([kw]) => `\\b${kw.replace(/ /g, "\\s+")}\\b`).join("|"),
    "gi"
);

// Build reverse map: token byte → keyword
const DECODE_MAP = new Map(DICTIONARY.map(([kw, token]) => [token, kw]));
const DECODE_REGEX = new RegExp(
    [...DECODE_MAP.keys()].map((t) => t.replace(/[\\]/g, "\\$&")).join("|"),
    "g"
);

export class Compression {
    private static preprocess(query: string): string {
        return query.replace(ENCODE_REGEX, (match) => {
            const normalized = match.replace(/\s+/g, " ").toUpperCase();
            for (const [kw, token] of DICTIONARY) {
                if (normalized === kw) return token;
            }
            return match;
        });
    }

    private static postprocess(text: string): string {
        return text.replace(DECODE_REGEX, (token) => DECODE_MAP.get(token) ?? token);
    }

    private static async deflateBytes(data: Uint8Array): Promise<Uint8Array> {
        const stream = new Blob([data as BlobPart])
            .stream()
            .pipeThrough(new CompressionStream("deflate-raw"));
        const buf = await (await new Response(stream).blob()).arrayBuffer();
        return new Uint8Array(buf);
    }

    private static async inflateBytes(data: Uint8Array): Promise<Uint8Array> {
        const stream = new Blob([data as BlobPart])
            .stream()
            .pipeThrough(new DecompressionStream("deflate-raw"));
        const buf = await (await new Response(stream).blob()).arrayBuffer();
        return new Uint8Array(buf);
    }

    private static toBase64Url(bytes: Uint8Array): string {
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }

    private static fromBase64Url(encoded: string): Uint8Array {
        let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4) base64 += "=";
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }

    static async compress(str: string): Promise<string> {
        const preprocessed = this.preprocess(str);
        const compressed = await this.deflateBytes(new TextEncoder().encode(preprocessed));
        return this.toBase64Url(compressed);
    }

    static async decompress(compressed: string): Promise<string> {
        const bytes = this.fromBase64Url(compressed);
        const decompressed = await this.inflateBytes(bytes);
        return this.postprocess(new TextDecoder().decode(decompressed));
    }
}
