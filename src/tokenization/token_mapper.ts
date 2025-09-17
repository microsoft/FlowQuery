import Token from "../../src/tokenization/token";
import Trie from "../../src/tokenization/trie";

class TokenMapper {
    private _trie: Trie = new Trie();
    constructor(private _enum: { [key: string]: any }) {
        for(const [key, value] of Object.entries(_enum)) {
            const token: Token | undefined = Token.method(key);
            if(token !== undefined && token.value !== null) {
                this._trie.insert(token);
            }
        }
    }
    public map(value: string): Token | undefined {
        return this._trie.find(value);
    }
    public get last_found(): string | null {
        return this._trie.last_found;
    }
}

export default TokenMapper;