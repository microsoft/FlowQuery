import Token from "./token";

class Node {
    private _children: Map<string, Node> = new Map();
    private _token: Token | undefined = undefined;

    public map(char: string): Node {
        return this._children.get(char) || this._children.set(char, new Node()).get(char)!;
    }

    public retrieve(char: string): Node | undefined {
        return this._children.get(char);
    }

    public set token(token: Token) {
        this._token = token;
    }

    public get token(): Token | undefined {
        return this._token;
    }

    public is_end_of_word(): boolean {
        return this._token !== undefined;
    }

    public no_children(): boolean {
        return this._children.size === 0;
    }
}

class Trie {
    private _root: Node = new Node();
    private _max_length: number = 0;
    private _last_found: string | null = null;

    public insert(token: Token): void {
        if(token.value === null || token.value.length === 0) {
            throw new Error("Token value cannot be null or empty");
        }
        let currentNode = this._root;
        for (const char of token.value) {
            currentNode = currentNode.map(char.toLowerCase());
        }
        if (token.value.length > this._max_length) {
            this._max_length = token.value.length;
        }
        currentNode.token = token;
    }

    public find(value: string): Token | undefined {
        if(value.length === 0) {
            return undefined;
        }
        let index = 0;
        let current: Node | undefined = undefined;
        let found: Token | undefined = undefined;
        this._last_found = null;
        while((current = (current || this._root).retrieve(value[index].toLowerCase())) !== undefined) {
            if(current.is_end_of_word()) {
                found = current.token;
                this._last_found = value.substring(0, index + 1);
            }
            index++;
            if(index === value.length || index > this._max_length) {
                break;
            }
        }
        if(current?.is_end_of_word()) {
            found = current.token;
            this._last_found = value.substring(0, index);
        }
        return found;
    }

    public get last_found(): string | null {
        return this._last_found;
    }
}

export default Trie;