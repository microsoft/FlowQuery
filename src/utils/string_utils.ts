/**
 * Utility class for string manipulation and validation.
 *
 * Provides methods for handling quoted strings, comments, escape sequences,
 * and identifier validation.
 */
class StringUtils {
    static readonly quotes: string[] = ['"', "'", "`"];
    static readonly letters = "abcdefghijklmnopqrstuvwxyz";
    static readonly digits = "0123456789";
    static readonly whitespace = " \t\n\r";
    static readonly word_valid_chars = StringUtils.letters + StringUtils.digits + "_";

    /**
     * Removes surrounding quotes from a string.
     *
     * @param str - The string to unquote
     * @returns The unquoted string
     */
    static unquote(str: string): string {
        if (str.length === 0) {
            return str;
        }
        if (str.length === 1 && StringUtils.quotes.includes(str)) {
            return "";
        }
        const first: string = str[0];
        const last: string = str[str.length - 1];
        if (StringUtils.quotes.includes(first) && first === last) {
            return str.substring(1, str.length - 1);
        }
        if (StringUtils.quotes.includes(last) && first !== last) {
            return str.substring(0, str.length - 1);
        }
        if (StringUtils.quotes.includes(first) && first !== last) {
            return str.substring(1);
        }
        return str;
    }

    /**
     * Removes comment markers from a string.
     *
     * @param str - The comment string
     * @returns The string without comment markers
     */
    static uncomment(str: string): string {
        if (str.length < 2) {
            return str;
        }
        if (str[0] === "/" && str[1] === "/") {
            return str.substring(2);
        }
        if (
            str[0] === "/" &&
            str[1] === "*" &&
            str[str.length - 2] === "*" &&
            str[str.length - 1] === "/"
        ) {
            return str.substring(2, str.length - 2);
        }
        return str;
    }

    /**
     * Removes escape sequences before quotes in a string.
     *
     * @param str - The string to process
     * @param quoteChar - The quote character that was escaped
     * @returns The string with escape sequences removed
     */
    static removeEscapedQuotes(str: string, quoteChar: string): string {
        let unescaped = "";
        for (let i = 0; i < str.length; i++) {
            if (str[i] === "\\" && str[i + 1] === quoteChar) {
                i++;
            }
            unescaped += str[i];
        }
        return unescaped;
    }

    /**
     * Unescapes a backtick-quoted identifier body: both the openCypher
     * doubled form (``) and the backslash form (\`) become one backtick.
     */
    static removeEscapedBackticks(str: string, quoteChar: string = "`"): string {
        let unescaped = "";
        for (let i = 0; i < str.length; i++) {
            if ((str[i] === "\\" || str[i] === quoteChar) && str[i + 1] === quoteChar) {
                i++;
            }
            unescaped += str[i];
        }
        return unescaped;
    }

    /**
     * Removes escaped braces ({{ and }}) from f-strings.
     *
     * @param str - The string to process
     * @returns The string with escaped braces resolved
     */
    static removeEscapedBraces(str: string): string {
        let unescaped = "";
        for (let i = 0; i < str.length; i++) {
            if ((str[i] === "{" && str[i + 1] === "{") || (str[i] === "}" && str[i + 1] === "}")) {
                i++;
            }
            unescaped += str[i];
        }
        return unescaped;
    }

    /**
     * Checks if a string is a valid identifier.
     *
     * @param str - The string to validate
     * @returns True if the string can be used as an identifier, false otherwise
     */
    static can_be_identifier(str: string): boolean {
        const lower = str.toLowerCase();
        if (lower.length === 0) {
            return false;
        }
        if (!StringUtils.letters.includes(lower[0]) && lower[0] !== "_") {
            return false;
        }
        return lower.split("").every((char) => StringUtils.word_valid_chars.includes(char));
    }
}

export default StringUtils;
