import Token from "../../src/tokenization/token";
import Keyword from "../../src/tokenization/keyword";
import Trie from "../../src/tokenization/trie";

test('Trie', () => {
    let trie = new Trie();
    for(const key of Object.keys(Keyword)) {
        const token: Token | undefined = Token.method(key);
        if(token !== undefined && token.value !== null) {
            trie.insert(token);
            expect(trie.find(key)).toBeDefined();
        }
    }
    expect(trie.find('not_a_keyword')).toBeUndefined();
    expect(trie.find('not_a_operator')).toBeUndefined();
    expect(trie.find('not_a_keyword_or_operator')).toBeUndefined();
    expect(trie.find('')).toBeUndefined();
    expect(trie.find(' ')).toBeUndefined();
    expect(trie.find('a')).toBeUndefined();
});