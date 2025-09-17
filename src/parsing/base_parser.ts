import Token from "../tokenization/token";
import Tokenizer from "../tokenization/tokenizer";

class BaseParser {
    private tokens: Token[] = <Token[]>[];
    private tokenIndex: number = 0;

    protected tokenize(statement: string): void {
        this.tokens = new Tokenizer(statement).tokenize();
        this.tokenIndex = 0;
    }

    protected setNextToken(): void {
        this.tokenIndex++;
    }

    protected peek(): Token | null {
        if(this.tokenIndex + 1 >= this.tokens.length) {
            return null;
        }
        return this.tokens[this.tokenIndex + 1];
    }

    protected ahead(tokens: Token[], skipWhitespaceAndComments: boolean = true): boolean {
        let j = 0;
        for(let i=this.tokenIndex; i<this.tokens.length; i++) {
            if(skipWhitespaceAndComments && this.tokens[i].isWhitespaceOrComment()) {
                continue;
            }
            if(!this.tokens[i].equals(tokens[j])) {
                return false;
            }
            j++;
            if(j === tokens.length) {
                break;
            }
        }
        return j === tokens.length;
    }

    protected get token(): Token {
        if(this.tokenIndex >= this.tokens.length) {
            return Token.EOF;
        }
        return this.tokens[this.tokenIndex];
    }

    protected get previousToken(): Token {
        if(this.tokenIndex - 1 < 0) {
            return Token.EOF;
        }
        return this.tokens[this.tokenIndex - 1];
    }
}

export default BaseParser;