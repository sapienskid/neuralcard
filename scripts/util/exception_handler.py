"""
Robust error handling and input sanitization utilities.
"""
import re
import traceback
from .logger import get_logger

logger = get_logger()

def sanitize_tag(tag):
    """
    Sanitize a tag to ensure it meets Anki's requirements:
    - No spaces (replaced with underscores)
    - No special characters (removed)
    - No leading/trailing whitespace
    - No HTML tags (removed)
    - No colons (replaced with underscores)
    """
    if not tag:
        return ""
    
    # Trim whitespace
    tag = str(tag).strip()
    
    # Replace spaces with underscores
    tag = tag.replace(' ', '_')
    
    # Replace problematic characters
    tag = tag.replace(':', '_')
    tag = tag.replace(',', '_')
    tag = tag.replace(';', '_')
    
    # Remove any HTML-like tags
    tag = re.sub(r'<[^>]+>', '', tag)
    
    # Remove any remaining invalid characters (keep only alphanumeric, underscores, hyphens)
    tag = re.sub(r'[^\w\-]', '', tag)
    
    # Ensure tag doesn't start with a number (Anki requirement)
    if tag and tag[0].isdigit():
        tag = f"tag_{tag}"
        
    return tag

def sanitize_tags(tags):
    """Safely process tags to ensure they meet Anki's requirements."""
    if not tags:
        return []
    
    # Handle both string and list input
    if isinstance(tags, str):
        # If tags is a string, return it as a singleton list that's been sanitized
        sanitized = sanitize_tag(tags)
        return [sanitized] if sanitized else []
    
    # If it's a sequence, process each tag
    sanitized_tags = []
    for tag in tags:
        if not tag:
            continue
            
        # Sanitize the tag
        tag_str = sanitize_tag(tag)
        
        if tag_str:
            sanitized_tags.append(tag_str)
            
    return sanitized_tags

def sanitize_options(options):
    """Safely process options for multiple choice cards."""
    if not options:
        return []
    
    # If it's a string, try to split it into a list
    if isinstance(options, str):
        # Try to parse as a list
        if options.strip().startswith('[') and options.strip().endswith(']'):
            try:
                # Remove brackets and split by commas
                options_str = options.strip()[1:-1]
                return [opt.strip().strip('"\'') for opt in options_str.split(',') if opt.strip()]
            except:
                # If parsing fails, treat as a single option
                return [options]
        # Split by newlines or semicolons
        elif '\n' in options:
            return [opt.strip() for opt in options.split('\n') if opt.strip()]
        elif ';' in options:
            return [opt.strip() for opt in options.split(';') if opt.strip()]
        else:
            # If no clear delimiter, treat as a single option
            return [options]
    
    # If it's already a list, sanitize each item
    if isinstance(options, list):
        return [str(opt).strip() for opt in options if opt]
    
    # Handle unexpected types
    return []

def sanitize_coordinates(coords):
    """Safely process coordinates for image occlusion cards."""
    if not coords:
        return []
    
    # If it's a string, try to parse as coordinates
    if isinstance(coords, str):
        try:
            # Try to extract coordinate sets like [x,y,w,h]
            coord_matches = re.findall(r'\[([\d\s,.]+?)\]', coords)
            result = []
            
            for match in coord_matches:
                # Split by commas or spaces and convert to integers
                coord_parts = re.split(r'[\s,]+', match.strip())
                if len(coord_parts) >= 4:
                    try:
                        # Convert to integers with fallbacks
                        x = int(coord_parts[0]) if coord_parts[0].isdigit() else 0
                        y = int(coord_parts[1]) if coord_parts[1].isdigit() else 0
                        w = int(coord_parts[2]) if coord_parts[2].isdigit() else 10
                        h = int(coord_parts[3]) if coord_parts[3].isdigit() else 10
                        
                        # Ensure minimum size
                        w = max(w, 5)
                        h = max(h, 5)
                        
                        result.append([x, y, w, h])
                    except (ValueError, IndexError):
                        continue
            return result
        except Exception as e:
            logger.warning(f"Error parsing coordinates: {str(e)}")
            return []
    
    # If it's already a list, validate each item
    if isinstance(coords, list):
        result = []
        for item in coords:
            # If it's a nested list with coordinates
            if isinstance(item, list) and len(item) >= 4:
                try:
                    # Convert to integers and ensure minimum values
                    x = int(item[0]) if str(item[0]).isdigit() else 0
                    y = int(item[1]) if str(item[1]).isdigit() else 0
                    w = max(int(item[2]) if str(item[2]).isdigit() else 10, 5)
                    h = max(int(item[3]) if str(item[3]).isdigit() else 10, 5)
                    result.append([x, y, w, h])
                except (ValueError, IndexError):
                    continue
        return result
    
    # Handle unexpected types
    return []

def safe_get_card_field(card, field, default=""):
    """Safely get a field from a card with proper error handling."""
    try:
        value = card.get(field, default)
        # Handle None values
        if value is None:
            return default
        # Convert to string if needed
        if not isinstance(value, str) and field not in ['options', 'masked_areas']:
            return str(value)
        return value
    except Exception as e:
        logger.warning(f"Error getting field '{field}': {str(e)}")
        return default

def normalize_boolean_field(value, default=True):
    """Normalize various forms of boolean input."""
    if isinstance(value, bool):
        return value
    
    if isinstance(value, str):
        # Convert common string representations to boolean
        value = value.lower().strip()
        if value in ['true', 'yes', 'y', '1', 't']:
            return True
        if value in ['false', 'no', 'n', '0', 'f']:
            return False
    
    # Handle numeric values
    if isinstance(value, (int, float)):
        return bool(value)
    
    # Default for anything else
    return default

def handle_exception(func):
    """Decorator for handling exceptions in card processing functions."""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error in {func.__name__}: {str(e)}")
            logger.debug(f"Exception details: {traceback.format_exc()}")
            # Return None to indicate failure
            return None
    return wrapper

def clean_field_content(content, is_html=False):
    """Clean field content to prevent errors in Anki."""
    if not content:
        return ""
    
    try:
        # Convert to string
        content = str(content)
        
        # Remove null bytes and other problematic characters
        content = content.replace('\0', '')
        
        # If HTML, ensure all tags are properly closed
        if is_html:
            # Simple tag balancing (for common unclosed tags)
            for tag in ['div', 'span', 'p', 'b', 'i', 'u', 'strong', 'em']:
                open_count = content.count(f'<{tag}')
                close_count = content.count(f'</{tag}')
                if open_count > close_count:
                    content += ''.join([f'</{tag}>' for _ in range(open_count - close_count)])
        
        return content
    except Exception as e:
        logger.warning(f"Error cleaning content: {str(e)}")
        return str(content) if content else ""
