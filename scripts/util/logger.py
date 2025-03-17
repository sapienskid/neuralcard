import logging
from pathlib import Path
from datetime import datetime

_logger = None

def get_logger():
    """Get or create the logger instance."""
    global _logger
    if _logger is None:
        _logger = logging.getLogger('flashcard_maker')
        _logger.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        
        # Console handler
        ch = logging.StreamHandler()
        ch.setFormatter(formatter)
        _logger.addHandler(ch)
    return _logger

def initialize_logger(log_dir: Path, debug_level: bool = False):
    """Initialize logger with file output."""
    logger = get_logger()
    logger.setLevel(logging.DEBUG if debug_level else logging.INFO)
    
    # File handler
    log_file = log_dir / f"flashcards_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    fh = logging.FileHandler(log_file)
    fh.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(fh)
    
    return logger
