import StringUtils from "../utils/string_utils";

class StringWalker {
    private _position: number;
    private readonly text: string;

    constructor(text: string) {
        this.text = text;
        this._position = 0;
    }

    public get position(): number {
        return this._position;
    }

    public get currentChar(): string {
        return this.text[this.position];
    }

    public get nextChar(): string {
        return this.text[this.position + 1];
    }

    public get previousChar(): string {
        return this.text[this.position - 1];
    }

    public get isAtEnd(): boolean {
        return this.position >= this.text.length;
    }

    public getString(startPosition: number): string {
        return this.text.substring(startPosition, this.position);
    }

    public getRemainingString(): string {
        return this.text.substring(this.position);
    }

    public checkForSingleComment(): boolean {
        if (this.singleLineCommentStart()) {
            while (!this.isAtEnd && !this.newLine()) {
                this._position++;
            }
            return true;
        }
        return false;
    }

    public checkForMultiLineComment(): boolean {
        if (this.multiLineCommentStart()) {
            while (!this.isAtEnd) {
                if (this.multiLineCommentEnd()) {
                    this._position += 2;
                    return true;
                }
                this._position++;
            }
            throw new Error(`Unterminated multi-line comment at position ${this.position}`);
        }
        return false;
    }

    public singleLineCommentStart(): boolean {
        return this.currentChar === '/' && this.nextChar === '/';
    }

    public multiLineCommentStart(): boolean {
        return this.currentChar === '/' && this.nextChar === '*';
    }

    public multiLineCommentEnd(): boolean {
        return this.currentChar === '*' && this.nextChar === '/';
    }

    public newLine(): boolean {
        if (this.currentChar === '\n') {
            return true;
        }
        return false;
    }

    public escaped(char: string): boolean {
        return this.currentChar === '\\' && this.nextChar === char;
    }

    public escapedBrace(): boolean {
        return (this.currentChar === '{' && this.nextChar === '{') || (this.currentChar === '}' && this.nextChar === '}');
    }

    public openingBrace(): boolean {
        return this.currentChar === '{';
    }

    public closingBrace(): boolean {
        return this.currentChar === '}';
    }

    public checkForUnderScore(): boolean {
        const foundUnderScore = this.currentChar === '_';
        if (foundUnderScore) {
            this._position++;
        }
        return foundUnderScore;
    }

    public checkForLetter(): boolean {
        const foundLetter = StringUtils.letters.includes(this.currentChar.toLowerCase());
        if (foundLetter) {
            this._position++;
        }
        return foundLetter;
    }

    public checkForDigit(): boolean {
        const foundDigit = StringUtils.digits.includes(this.currentChar);
        if (foundDigit) {
            this._position++;
        }
        return foundDigit;
    }

    public checkForQuote(): string | null {
        const quoteChar = this.currentChar;
        if (quoteChar === '"' || quoteChar === "'" || quoteChar === '`') {
            this._position++;
            return quoteChar;
        }
        return null;
    }

    public checkForString(value: string): boolean {
        const _string = this.text.substring(this.position, this.position + value.length);

        const foundString = _string.toLowerCase() === value.toLowerCase();
        if (foundString) {
            this._position += value.length;
        }
        return foundString;
    }

    public checkForWhitespace(): boolean {
        return StringUtils.whitespace.includes(this.currentChar);
    }

    public checkForFStringStart(): boolean {
        return this.currentChar.toLowerCase() === 'f' && ['\'', '"', '`'].includes(this.nextChar);
    }

    public moveNext(): void {
        this._position++;
    }

    public moveBy(steps: number): void {
        this._position += steps;
    }

    public movePrevious(): void {
        this._position--;
    }

    public is_word(word: string | null): boolean {
        if (word === null) {
            return false;
        }
        return this.text.substring(this.position, this.position + word.length) === word;
    }

    public word_continuation(word: string): boolean {
        const next = this.text[this.position + word.length];
        return StringUtils.word_valid_chars.includes(next);
    }
}

export default StringWalker;