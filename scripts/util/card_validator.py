from typing import Tuple, Dict, Any, Optional

def validate_card(card: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validate and clean a card dictionary."""
    if not isinstance(card, dict):
        return False, None

    # Required fields for all card types
    if 'type' not in card:
        card['type'] = 'basic'  # Default to basic if no type specified

    # Clean and validate by type
    card_type = card.get('type', '').lower()
    
    try:
        if card_type == 'cloze':
            return validate_cloze_card(card)
        elif card_type in ['multiple-choice', 'mcq']:
            return validate_multiple_choice_card(card)
        elif card_type == 'image-occlusion':
            return validate_image_occlusion_card(card)
        elif card_type == 'fill-in-the-blank':
            return validate_fill_in_blank_card(card)
        elif card_type in ['basic', 'reversed', 'basic-and-reversed']:
            return validate_basic_card(card)
        else:
            # Default to basic card validation for unknown types
            return validate_basic_card(card)
    except Exception as e:
        print(f"Error validating card: {str(e)}")
        return False, None

def validate_basic_card(card: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validate a basic card type."""
    if 'front' not in card or not card['front'].strip():
        return False, None
    if 'back' not in card or not card['back'].strip():
        return False, None
    
    # Clean the card
    return True, {
        'type': card['type'],
        'front': card['front'].strip(),
        'back': card['back'].strip(),
        'tags': card.get('tags', '').strip()
    }

def validate_cloze_card(card: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validate a cloze deletion card."""
    if 'front' not in card or not card['front'].strip():
        return False, None
    
    # Check for cloze markers
    content = card['front']
    if '{{' not in content or '}}' not in content:
        return False, None
    
    return True, {
        'type': 'cloze',
        'front': content.strip(),
        'tags': card.get('tags', '').strip()
    }

def validate_multiple_choice_card(card: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validate a multiple choice card."""
    if 'front' not in card or not card['front'].strip():
        return False, None
    if 'options' not in card or not card['options']:
        return False, None
    if 'correct_answer' not in card:
        return False, None
    
    # Ensure we have at least 2 options
    if len(card['options']) < 2:
        return False, None
    
    # Ensure correct answer is in options
    if card['correct_answer'] not in card['options']:
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
    """Validate an image occlusion card."""
    if 'front' not in card or not card['front'].strip():
        return False, None
    if 'masked_areas' not in card or not card['masked_areas']:
        return False, None
    
    # Ensure front contains an image
    if '![' not in card['front'] or '](' not in card['front']:
        return False, None
    
    return True, {
        'type': 'image-occlusion',
        'front': card['front'].strip(),
        'masked_areas': card['masked_areas'],
        'back': card.get('back', '').strip(),
        'tags': card.get('tags', '').strip()
    }

def validate_fill_in_blank_card(card: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Validate a fill-in-the-blank card."""
    if 'front' not in card or not card['front'].strip():
        return False, None
    if 'back' not in card or not card['back'].strip():
        return False, None
    
    # Ensure there's at least one blank
    if '_____' not in card['front']:
        return False, None
    
    return True, {
        'type': 'fill-in-the-blank',
        'front': card['front'].strip(),
        'back': card['back'].strip(),
        'tags': card.get('tags', '').strip()
    }
