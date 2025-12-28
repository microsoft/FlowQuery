import Token from "../tokenization/token";
import Tokenizer from "../tokenization/tokenizer";

/**
 * Base class for parsers providing common token manipulation functionality.
 *
 * This class handles tokenization and provides utility methods for navigating
 * through tokens, peeking ahead, and checking token sequences.
 */
class BaseParser {
    private tokens: Token[] = <Token[]>[];
    private tokenIndex: number = 0;

    constructor(tokens: Token[] | null = null) {
        if (tokens !== null) {
            this.tokens = tokens;
        }
    }

    /**
     * Tokenizes a statement and initializes the token array.
     *
     * @param statement - The input statement to tokenize
     */
    protected tokenize(statement: string): void {
        this.tokens = new Tokenizer(statement).tokenize();
        this.tokenIndex = 0;
    }

    /**
     * Advances to the next token in the sequence.
     */
    protected setNextToken(): void {
        this.tokenIndex++;
    }

    /**
     * Peeks at the next token without advancing the current position.
     *
     * @returns The next token, or null if at the end of the token stream
     */
    protected peek(): Token | null {
        if (this.tokenIndex + 1 >= this.tokens.length) {
            return null;
        }
        return this.tokens[this.tokenIndex + 1];
    }

    /**
     * Checks if a sequence of tokens appears ahead in the token stream.
     *
     * @param tokens - The sequence of tokens to look for
     * @param skipWhitespaceAndComments - Whether to skip whitespace and comments when matching
     * @returns True if the token sequence is found ahead, false otherwise
     */
    protected ahead(tokens: Token[], skipWhitespaceAndComments: boolean = true): boolean {
        let j = 0;
        for (let i = this.tokenIndex; i < this.tokens.length; i++) {
            if (skipWhitespaceAndComments && this.tokens[i].isWhitespaceOrComment()) {
                continue;
            }
            if (!this.tokens[i].equals(tokens[j])) {
                return false;
            }
            j++;
            if (j === tokens.length) {
                break;
            }
        }
        return j === tokens.length;
    }

    /**
     * Gets the current token.
     *
     * @returns The current token, or EOF if at the end
     */
    protected get token(): Token {
        if (this.tokenIndex >= this.tokens.length) {
            return Token.EOF;
        }
        return this.tokens[this.tokenIndex];
    }

    /**
     * Gets the previous token.
     *
     * @returns The previous token, or EOF if at the beginning
     */
    protected get previousToken(): Token {
        if (this.tokenIndex - 1 < 0) {
            return Token.EOF;
        }
        return this.tokens[this.tokenIndex - 1];
    }

    protected *getTokensUntil(token: Token): Generator<Token> {
        while (this.tokenIndex < this.tokens.length && !this.token.equals(token)) {
            yield this.token;
            this.setNextToken();
        }
    }
}

export default BaseParser;
