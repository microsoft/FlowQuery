"""Utility class for string manipulation and validation."""


class StringUtils:
    """Utility class for string manipulation and validation.
    
    Provides methods for handling quoted strings, comments, escape sequences,
    and identifier validation.
    """
    
    quotes = ['"', "'", '`']
    letters = 'abcdefghijklmnopqrstuvwxyz'
    digits = '0123456789'
    whitespace = ' \t\n\r'
    word_valid_chars = letters + letters.upper() + digits + '_'

    @staticmethod
    def unquote(s: str) -> str:
        """Removes surrounding quotes from a string.
        
        Args:
            s: The string to unquote
            
        Returns:
            The unquoted string
        """
        if len(s) == 0:
            return s
        if len(s) == 1 and s in StringUtils.quotes:
            return ''
        first = s[0]
        last = s[-1]
        if first in StringUtils.quotes and first == last:
            return s[1:-1]
        if last in StringUtils.quotes and first != last:
            return s[:-1]
        if first in StringUtils.quotes and first != last:
            return s[1:]
        return s

    @staticmethod
    def uncomment(s: str) -> str:
        """Removes comment markers from a string.
        
        Args:
            s: The comment string
            
        Returns:
            The string without comment markers
        """
        if len(s) < 2:
            return s
        if s[0] == '/' and s[1] == '/':
            return s[2:]
        if s[0] == '/' and s[1] == '*' and s[-2] == '*' and s[-1] == '/':
            return s[2:-2]
        return s

    @staticmethod
    def remove_escaped_quotes(s: str, quote_char: str) -> str:
        """Removes escape sequences before quotes in a string.
        
        Args:
            s: The string to process
            quote_char: The quote character that was escaped
            
        Returns:
            The string with escape sequences removed
        """
        unescaped = ''
        i = 0
        while i < len(s):
            if i < len(s) - 1 and s[i] == '\\' and s[i + 1] == quote_char:
                i += 1
            unescaped += s[i]
            i += 1
        return unescaped

    @staticmethod
    def remove_escaped_braces(s: str) -> str:
        """Removes escaped braces ({{ and }}) from f-strings.
        
        Args:
            s: The string to process
            
        Returns:
            The string with escaped braces resolved
        """
        unescaped = ''
        i = 0
        while i < len(s):
            if i < len(s) - 1 and ((s[i] == '{' and s[i + 1] == '{') or (s[i] == '}' and s[i + 1] == '}')):
                i += 1
            unescaped += s[i]
            i += 1
        return unescaped

    @staticmethod
    def can_be_identifier(s: str) -> bool:
        """Checks if a string is a valid identifier.
        
        Args:
            s: The string to validate
            
        Returns:
            True if the string can be used as an identifier, false otherwise
        """
        lower = s.lower()
        if len(lower) == 0:
            return False
        if lower[0] not in StringUtils.letters and lower[0] != '_':
            return False
        return all(char in StringUtils.word_valid_chars for char in lower)
