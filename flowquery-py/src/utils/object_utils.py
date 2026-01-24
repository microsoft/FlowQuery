"""Utility class for object-related operations."""

from typing import Any, List, Type


class ObjectUtils:
    """Utility class for object-related operations."""

    @staticmethod
    def is_instance_of_any(obj: Any, classes: List[Type]) -> bool:
        """Checks if an object is an instance of any of the provided classes.
        
        Args:
            obj: The object to check
            classes: Array of class constructors to test against
            
        Returns:
            True if the object is an instance of any class, False otherwise
        """
        return any(isinstance(obj, cls) for cls in classes)
