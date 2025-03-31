from typing import Tuple, Dict, Any, Optional, List
import re
from util.logger import get_logger

logger = get_logger()

def validate_card(card: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validate and clean a card dictionary, handling common formatting mistakes."""
    if not isinstance(card, dict):
        logger.warning("Card is not a dictionary")
        return False, None

    # Pre-process card content - handle empty lines in front/back content
    for field in ['front', 'back']:
        if field in card and card[field] is not None:
            # Normalize line endings and handle empty lines
            card[field] = card[field].replace('\r\n', '\n').replace('\r', '\n')
            # Remove leading/trailing whitespace but keep internal empty lines
            card[field] = card[field].strip()

    # Required fields for all card types
    if 'type' not in card:
        logger.info("Card type not specified, defaulting to basic")
        card['type'] = 'basic'  # Default to basic if no type specified

    # Common mistakes correction: whitespace in type, case sensitivity
    if 'type' in card:
        card['type'] = card['type'].strip().lower()
        # Fix common type misspellings
        type_corrections = {
            'multiplechoice': 'multiple-choice',
            'multiple choice': 'multiple-choice',
            'multiple_choice': 'multiple-choice',
            'cloze deletion': 'cloze',
            'fillinblank': 'fill-in-the-blank',
            'fill in blank': 'fill-in-the-blank',
            'fill-in-blank': 'fill-in-the-blank',
            'fill_in_the_blank': 'fill-in-the-blank',
            'truefalse': 'true-false',
            'true/false': 'true-false',
            'true_false': 'true-false',
            'image occlusion': 'image-occlusion',
            'image_occlusion': 'image-occlusion',
        }
        if card['type'] in type_corrections:
            old_type = card['type']
            card['type'] = type_corrections[old_type]
            logger.info(f"Auto-corrected card type from '{old_type}' to '{card['type']}'")

    # Clean and validate by type
    card_type = card.get('type', '').lower()
    
    try:
        if card_type == 'cloze':
            return validate_cloze_card(card)
        elif card_type in ['multiple-choice', 'mcq']:
            return validate_multiple_choice_card(card)
        elif card_type in ['true-false', 'true/false', 'truefalse']:
            return validate_true_false_card(card)
        elif card_type == 'image-occlusion':
            return validate_image_occlusion_card(card)
        elif card_type == 'fill-in-the-blank':
            return validate_fill_in_blank_card(card)
        elif card_type in ['basic', 'reversed', 'basic-and-reversed']:
            return validate_basic_card(card)
        else:
            # Default to basic card validation for unknown types
            logger.warning(f"Unknown card type '{card_type}', treating as basic card")
            card['type'] = 'basic'
            return validate_basic_card(card)
    except Exception as e:
        logger.error(f"Error validating {card_type} card: {str(e)}")
        return False, None

def validate_basic_card(card: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validate a basic card type with improved error handling."""
    issues = []
    
    # Check for required fields and add issues if missing
    if 'front' not in card:
        issues.append("Missing 'front' field")
    elif not card['front'].strip():
        issues.append("'front' field is empty")
        
    if 'back' not in card:
        issues.append("Missing 'back' field")
    elif not card['back'].strip():
        issues.append("'back' field is empty")
    
    # If we have issues, log them and return failure
    if issues:
        logger.warning(f"Basic card validation failed: {', '.join(issues)}")
        return False, None
    
    # Clean the card
    return True, {
        'type': card['type'],
        'front': card['front'].strip(),
        'back': card['back'].strip(),
        'tags': card.get('tags', '').strip()
    }

def validate_cloze_card(card: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validate a cloze deletion card with auto-correction for common mistakes."""
    issues = []
    
    if 'front' not in card:
        issues.append("Missing 'front' field")
    elif not card['front'].strip():
        issues.append("'front' field is empty")
    else:
        content = card['front']
        
        # Auto-correct common cloze formatting mistakes
        # Example: [text] -> {{text}}
        if ('{{' not in content or '}}' not in content) and ('[' in content and ']' in content):
            # Replace [text] with {{text}}
            content = re.sub(r'\[([^\]]+)\]', r'{{\1}}', content)
            logger.info("Auto-corrected [text] to {{text}} format in cloze card")
            card['front'] = content
        
        # Example: {text} -> {{text}}
        elif ('{{' not in content or '}}' not in content) and ('{' in content and '}' in content):
            # Replace {text} with {{text}}
            content = re.sub(r'\{([^{}]+)\}', r'{{\1}}', content)
            logger.info("Auto-corrected {text} to {{text}} format in cloze card")
            card['front'] = content
            
        # Check for any cloze markers after potential corrections
        if '{{' not in content or '}}' not in content:
            issues.append("No cloze deletion markers found (use {{text}} format)")
    
    # If we have issues, log them and return failure
    if issues:
        logger.warning(f"Cloze card validation failed: {', '.join(issues)}")
        return False, None
    
    return True, {
        'type': 'cloze',
        'front': card['front'].strip(),
        'tags': card.get('tags', '').strip()
    }

def validate_multiple_choice_card(card: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validate a multiple choice card with better error reporting and auto-correction."""
    issues = []
    
    # Check for required fields
    if 'front' not in card:
        issues.append("Missing 'front' field")
    elif not card['front'].strip():
        issues.append("'front' field is empty")
    
    # Check for options and try to recover from common mistakes
    if 'options' not in card or not card['options']:
        # Check if options might be in a text format in the 'back' field
        if 'back' in card and card['back']:
            # Try to parse options from the back field
            lines = card['back'].split('\n')
            if len(lines) >= 2:  # Need at least 2 options
                logger.info("Attempting to auto-extract options from 'back' field")
                options = [line.strip() for line in lines if line.strip()]
                if len(options) >= 2:
                    card['options'] = options
                    # Try to guess the correct answer (often marked with * or similar)
                    for i, opt in enumerate(options):
                        if opt.startswith('*') or opt.startswith('- [x]'):
                            card['correct_answer'] = opt.lstrip('*- [x]').strip()
                            logger.info(f"Auto-detected correct answer: {card['correct_answer']}")
                            break
    
    # Double-check options after potential recovery
    if 'options' not in card or not card['options']:
        issues.append("Missing or empty 'options' field")
    elif len(card['options']) < 2:
        issues.append("Multiple choice cards need at least 2 options")
    
    # Check for correct answer
    if 'correct_answer' not in card:
        # If we have options but no correct answer, default to the first option
        if 'options' in card and len(card['options']) > 0:
            logger.info("No correct_answer specified, defaulting to first option")
            card['correct_answer'] = card['options'][0]
        else:
            issues.append("Missing 'correct_answer' field")
    
    # If we have both options and correct_answer, verify the correct answer is in options
    if 'options' in card and card['options'] and 'correct_answer' in card:
        if card['correct_answer'] not in card['options']:
            # Try to find a close match for the correct answer in the options
            closest_match = None
            for opt in card['options']:
                if card['correct_answer'].lower() in opt.lower() or opt.lower() in card['correct_answer'].lower():
                    closest_match = opt
                    break
            
            if closest_match:
                logger.info(f"Auto-corrected correct_answer from '{card['correct_answer']}' to '{closest_match}'")
                card['correct_answer'] = closest_match
            else:
                issues.append(f"The 'correct_answer' '{card['correct_answer']}' is not in the options list")
    
    # If we have issues, log them and return failure
    if issues:
        logger.warning(f"Multiple choice card validation failed: {', '.join(issues)}")
        return False, None
    
    return True, {
        'type': 'multiple-choice',
        'front': card['front'].strip(),
        'options': card['options'],
        'correct_answer': card['correct_answer'],
        'back': card.get('back', '').strip(),
        'tags': card.get('tags', '').strip()
    }

def validate_image_occlusion_card(card: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validate an image occlusion card with better error handling."""
    issues = []
    
    if 'front' not in card or not card['front'].strip():
        issues.append("Missing or empty 'front' field")
    else:
        # Ensure front contains an image
        if '![' not in card['front'] or '](' not in card['front']:
            issues.append("Front field must contain an image in Markdown format: ![alt text](image_path)")
    
    if 'masked_areas' not in card or not card['masked_areas']:
        issues.append("Missing or empty 'masked_areas' field")
    
    # If we have issues, log them and return failure
    if issues:
        logger.warning(f"Image occlusion card validation failed: {', '.join(issues)}")
        return False, None
    
    return True, {
        'type': 'image-occlusion',
        'front': card['front'].strip(),
        'masked_areas': card['masked_areas'],
        'back': card.get('back', '').strip(),
        'tags': card.get('tags', '').strip()
    }

def validate_fill_in_blank_card(card: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validate a fill-in-the-blank card with auto-correction for common mistakes."""
    issues = []
    
    if 'front' not in card:
        issues.append("Missing 'front' field")
    elif not card['front'].strip():
        issues.append("'front' field is empty")
    else:
        # Auto-correct if no blanks found but there are underscores
        front = card['front']
        if '_____' not in front:
            # Check for other common blank formats and convert them
            if '____' in front or '___' in front:
                front = front.replace('____', '_____')
                front = front.replace('___', '_____')
                card['front'] = front
                logger.info("Auto-corrected underscores to standard _____")
            elif '__' in front:
                front = front.replace('__', '_____')
                card['front'] = front
                logger.info("Auto-corrected __ to standard _____")
            elif '_' in front and '__' not in front:
                front = front.replace('_', '_____')
                card['front'] = front
                logger.info("Auto-corrected _ to standard _____")
            
        # Check if we now have blanks after correction
        if '_____' not in card['front']:
            issues.append("No blanks found in fill-in-the-blank card (use _____ for blanks)")
    
    if 'back' not in card or not card['back'].strip():
        issues.append("Missing or empty 'back' field")
    
    # If we have issues, log them and return failure
    if issues:
        logger.warning(f"Fill-in-the-blank card validation failed: {', '.join(issues)}")
        return False, None
    
    return True, {
        'type': 'fill-in-the-blank',
        'front': card['front'].strip(),
        'back': card['back'].strip(),
        'tags': card.get('tags', '').strip()
    }

def validate_true_false_card(card: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validate a true/false card with auto-correction for common mistakes."""
    issues = []
    
    if 'front' not in card or not card['front'].strip():
        issues.append("Missing or empty 'front' field")
    
    # Check and normalize the correct answer
    if 'correct_answer' not in card:
        issues.append("Missing 'correct_answer' field")
    else:
        # Normalize the correct answer to "True" or "False"
        answer = str(card['correct_answer']).strip().lower()
        if answer in ('true', 't', 'yes', 'y', '1'):
            card['correct_answer'] = 'True'
        elif answer in ('false', 'f', 'no', 'n', '0'):
            card['correct_answer'] = 'False'
        else:
            issues.append(f"Correct answer must be True or False, got '{card['correct_answer']}'")
    
    # If we have issues, log them and return failure
    if issues:
        logger.warning(f"True/False card validation failed: {', '.join(issues)}")
        return False, None
    
    return True, {
        'type': 'true-false',
        'front': card['front'].strip(),
        'correct_answer': card['correct_answer'],
        'back': card.get('back', '').strip(),
        'tags': card.get('tags', '').strip()
    }
