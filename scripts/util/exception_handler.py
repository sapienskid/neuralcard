from typing import Tuple
import traceback
from util.logger import get_logger

logger = get_logger()

class FlashcardException(Exception):
    """Base exception class for flashcard operations."""
    pass

class ParsingException(FlashcardException):
    """Raised when there's an error parsing markdown content."""
    pass

class ValidationException(FlashcardException):
    """Raised when there's an error validating card content."""
    pass

class DeckCreationException(FlashcardException):
    """Raised when there's an error creating the Anki deck."""
    pass

def handle_exception(error: Exception, context: str) -> Tuple[str, bool]:
    """
    Handle exceptions in a consistent way.
    Returns a tuple of (error_message, is_critical)
    """
    is_critical = isinstance(error, (ParsingException, ValidationException, DeckCreationException))
    
    error_msg = f"Error {context}: {str(error)}"
    logger.error(error_msg)
    if is_critical:
        logger.error(traceback.format_exc())
    
    # Format error message for display
    if isinstance(error, ParsingException):
        error_msg = f"Failed to parse markdown: {str(error)}"
    elif isinstance(error, ValidationException):
        error_msg = f"Invalid card content: {str(error)}"
    elif isinstance(error, DeckCreationException):
        error_msg = f"Failed to create deck: {str(error)}"
    else:
        error_msg = f"An error occurred while {context}: {str(error)}"
    
    return error_msg, is_critical
