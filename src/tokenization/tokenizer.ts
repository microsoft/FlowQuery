import Keyword from './keyword';
import Token from './token';
import StringWalker from './string_walker';
import StringUtils from '../utils/string_utils';
import Symbol from './symbol';
import Operator from './operator';
import TokenMapper from './token_mapper';

class Tokenizer {
    private walker: StringWalker;
    private keywords: TokenMapper = new TokenMapper(Keyword);
    private symbols: TokenMapper = new TokenMapper(Symbol);
    private operators: TokenMapper = new TokenMapper(Operator);

    constructor(input: string) {
        this.walker = new StringWalker(input);
    }

    public tokenize(): Token[] {
        const tokens: Token[] = [];
        let last: Token | null = null;
        while (!this.walker.isAtEnd) {
            tokens.push(...this.f_string());
            last = this.getLastNonWhitespaceOrNonCommentToken(tokens) || last;
            const token = this.getNextToken(last);
            if (token === null) {
                throw new Error(`Unrecognized token at position ${this.walker.position}`);
            }
            token.position = this.walker.position;
            tokens.push(token);
        }
        return tokens;
    }

    private getLastNonWhitespaceOrNonCommentToken(tokens: Token[]): Token | null {
        if (tokens.length === 0) {
            return null;
        }
        if(!tokens[tokens.length - 1].isWhitespaceOrComment()) {
            return tokens[tokens.length - 1];
        }
        return null;
    }

    private getNextToken(last: Token | null = null): Token | null {
        if (this.walker.isAtEnd) {
            return Token.EOF;
        }
        return (
            this.comment() ||
            this.whitespace() ||
            this.lookup(this.keywords) ||
            this.lookup(this.operators, last, this.skipMinus) ||
            this.identifier() ||
            this.string() ||
            this.number() ||
            this.lookup(this.symbols)
        );
    }

    public comment(): Token | null {
        const startPosition = this.walker.position;
        if (this.walker.checkForSingleComment() || this.walker.checkForMultiLineComment()) {
            const uncommented = StringUtils.uncomment(this.walker.getString(startPosition));
            return Token.COMMENT(uncommented);
        }
        return null;
    }

    private identifier(): Token | null {
        const startPosition = this.walker.position;
        if (this.walker.checkForUnderScore() || this.walker.checkForLetter()) {
            while (!this.walker.isAtEnd && (this.walker.checkForLetter() || this.walker.checkForDigit() || this.walker.checkForUnderScore())) {
                ;
            }
            return Token.IDENTIFIER(this.walker.getString(startPosition));
        }
        return null;
    }

    private string(): Token | null {
        const startPosition = this.walker.position;
        const quoteChar = this.walker.checkForQuote();
        if (quoteChar === null) {
            return null;
        }
        while (!this.walker.isAtEnd) {
            if (this.walker.escaped(quoteChar)) {
                this.walker.moveNext();
                this.walker.moveNext();
                continue;
            }
            if (this.walker.checkForString(quoteChar)) {
                const value = this.walker.getString(startPosition);
                if (quoteChar === Symbol.BACKTICK) {
                    return Token.BACKTICK_STRING(value, quoteChar);
                }
                return Token.STRING(value, quoteChar);
            }
            this.walker.moveNext();
        }
        throw new Error(`Unterminated string at position ${startPosition}`);
    }

    private *f_string(): Iterable<Token> {
        if(!this.walker.checkForFStringStart()) {
            return;
        }
        this.walker.moveNext(); // skip the f
        let position = this.walker.position;
        const quoteChar = this.walker.checkForQuote();
        if (quoteChar === null) {
            return;
        }
        while (!this.walker.isAtEnd) {
            if (this.walker.escaped(quoteChar) || this.walker.escapedBrace()) {
                this.walker.moveNext();
                this.walker.moveNext();
                continue;
            }
            if(this.walker.openingBrace()) {
                yield Token.F_STRING(this.walker.getString(position), quoteChar);
                position = this.walker.position;
                yield Token.OPENING_BRACE;
                this.walker.moveNext(); // skip the opening brace
                position = this.walker.position;
                while(!this.walker.isAtEnd && !this.walker.closingBrace()) {
                    const token = this.getNextToken();
                    if(token !== null) {
                        yield token;
                    } else {
                        break;
                    }
                    if(this.walker.closingBrace()) {
                        yield Token.CLOSING_BRACE;
                        this.walker.moveNext(); // skip the closing brace
                        position = this.walker.position;
                        break;
                    }
                }
            }
            if (this.walker.checkForString(quoteChar)) {
                yield Token.F_STRING(this.walker.getString(position), quoteChar);
                return;
            };
            this.walker.moveNext();
        }
    }

    private whitespace(): Token | null {
        let foundWhitespace = false;
        while (!this.walker.isAtEnd && this.walker.checkForWhitespace()) {
            this.walker.moveNext();
            foundWhitespace = true;
        }
        return foundWhitespace ? Token.WHITESPACE : null;
    }

    private number(): Token | null {
        const startPosition = this.walker.position;
        if (this.walker.checkForString('-') || this.walker.checkForDigit()) {
            while (!this.walker.isAtEnd && this.walker.checkForDigit()) {
                ;
            }
            if (this.walker.checkForString(Symbol.DOT)) {
                while (!this.walker.isAtEnd && this.walker.checkForDigit()) {
                    ;
                }
            }
            const _number = this.walker.getString(startPosition);
            return Token.NUMBER(_number);
        }
        return null;
    }

    private lookup(mapper: TokenMapper, last: Token | null = null, skip?: (last: Token | null, current: Token) => boolean): Token | null {
        const token = mapper.map(this.walker.getRemainingString());
        if (token !== undefined && token.value !== null) {
            if(token.can_be_identifier && this.walker.word_continuation(token.value)) {
                return null;
            }
            if (skip && last && skip(last, token)) {
                return null;
            }
            this.walker.moveBy(token.value.length);
            if(mapper.last_found !== null) {
                token.case_sensitive_value = mapper.last_found;
            }
            return token;
        }
        return null;
    }

    private skipMinus(last: Token | null, current: Token): boolean {
        if (last === null) {
            return false;
        }
        if((last.isKeyword() || last.isComma() || last.isColon()) && current.isNegation()) {
            return true;
        }
        return false;
    }
}

export default Tokenizer;