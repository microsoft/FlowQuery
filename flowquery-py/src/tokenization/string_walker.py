"""Utility class for walking through a string character by character during tokenization."""

from ..utils.string_utils import StringUtils


class StringWalker:
    """Utility class for walking through a string character by character during tokenization.
    
    Provides methods to check for specific character patterns, move through the string,
    and extract substrings. Used by the Tokenizer to process input text.
    
    Example:
        walker = StringWalker("WITH x as variable")
        while not walker.is_at_end:
            # Process characters
    """

    def __init__(self, text: str):
        """Creates a new StringWalker for the given text.
        
        Args:
            text: The input text to walk through
        """
        self._text = text
        self._position = 0

    @property
    def position(self) -> int:
        return self._position

    @property
    def current_char(self) -> str:
        if self._position >= len(self._text):
            return ''
        return self._text[self._position]

    @property
    def next_char(self) -> str:
        if self._position + 1 >= len(self._text):
            return ''
        return self._text[self._position + 1]

    @property
    def previous_char(self) -> str:
        if self._position - 1 < 0:
            return ''
        return self._text[self._position - 1]

    @property
    def is_at_end(self) -> bool:
        return self._position >= len(self._text)

    def get_string(self, start_position: int) -> str:
        return self._text[start_position:self._position]

    def get_remaining_string(self) -> str:
        return self._text[self._position:]

    def check_for_single_comment(self) -> bool:
        if self.single_line_comment_start():
            while not self.is_at_end and not self.new_line():
                self._position += 1
            return True
        return False

    def check_for_multi_line_comment(self) -> bool:
        if self.multi_line_comment_start():
            while not self.is_at_end:
                if self.multi_line_comment_end():
                    self._position += 2
                    return True
                self._position += 1
            raise ValueError(f"Unterminated multi-line comment at position {self._position}")
        return False

    def single_line_comment_start(self) -> bool:
        return self.current_char == '/' and self.next_char == '/'

    def multi_line_comment_start(self) -> bool:
        return self.current_char == '/' and self.next_char == '*'

    def multi_line_comment_end(self) -> bool:
        return self.current_char == '*' and self.next_char == '/'

    def new_line(self) -> bool:
        return self.current_char == '\n'

    def escaped(self, char: str) -> bool:
        return self.current_char == '\\' and self.next_char == char

    def escaped_brace(self) -> bool:
        return ((self.current_char == '{' and self.next_char == '{') or 
                (self.current_char == '}' and self.next_char == '}'))

    def opening_brace(self) -> bool:
        return self.current_char == '{'

    def closing_brace(self) -> bool:
        return self.current_char == '}'

    def check_for_under_score(self) -> bool:
        found_under_score = self.current_char == '_'
        if found_under_score:
            self._position += 1
        return found_under_score

    def check_for_letter(self) -> bool:
        found_letter = self.current_char.lower() in StringUtils.letters
        if found_letter:
            self._position += 1
        return found_letter

    def check_for_digit(self) -> bool:
        found_digit = self.current_char in StringUtils.digits
        if found_digit:
            self._position += 1
        return found_digit

    def check_for_quote(self) -> str | None:
        quote_char = self.current_char
        if quote_char in ('"', "'", '`'):
            self._position += 1
            return quote_char
        return None

    def check_for_string(self, value: str) -> bool:
        _string = self._text[self._position:self._position + len(value)]
        found_string = _string.lower() == value.lower()
        if found_string:
            self._position += len(value)
        return found_string

    def check_for_whitespace(self) -> bool:
        return self.current_char in StringUtils.whitespace

    def check_for_f_string_start(self) -> bool:
        return self.current_char.lower() == 'f' and self.next_char in ("'", '"', '`')

    def move_next(self) -> None:
        self._position += 1

    def move_by(self, steps: int) -> None:
        self._position += steps

    def move_previous(self) -> None:
        self._position -= 1

    def is_word(self, word: str | None) -> bool:
        if word is None:
            return False
        return self._text[self._position:self._position + len(word)] == word

    def word_continuation(self, word: str) -> bool:
        next_pos = self._position + len(word)
        if next_pos >= len(self._text):
            return False
        next_char = self._text[next_pos]
        return next_char in StringUtils.word_valid_chars
