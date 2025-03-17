import re
from typing import List, Dict, Any

def parse_markdown(content: str) -> List[Dict[str, Any]]:
    """Parse markdown content into a list of card dictionaries."""
    cards = []
    card_blocks = content.split('<!-- Anki Card -->')
    
    for block in card_blocks:
        if not block.strip():
            continue
            
        card = {}
        
        # Extract card type
        type_match = re.search(r'<!--\s*type:\s*(\w+(?:-\w+)*)\s*-->', block)
        if type_match:
            card['type'] = type_match.group(1)
        
        # Handle different card types
        if card.get('type') == 'cloze':
            # For cloze cards, we only need the content between front tags
            front_match = re.search(r'<!--\s*front\s*-->(.*?)(?=<!--|$)', block, re.DOTALL)
            if front_match:
                card['front'] = front_match.group(1).strip()
        
        elif card.get('type') == 'multiple-choice' or card.get('type') == 'mcq':
            # Extract question
            front_match = re.search(r'<!--\s*front\s*-->(.*?)(?=<!--\s*options|$)', block, re.DOTALL)
            if front_match:
                card['front'] = front_match.group(1).strip()
            
            # Extract options
            options = []
            options_text = re.search(r'<!--\s*options\s*-->(.*?)(?=<!--\s*back|$)', block, re.DOTALL)
            if options_text:
                for line in options_text.group(1).strip().split('\n'):
                    line = line.strip()
                    if line:
                        if '<!-- correct -->' in line:
                            card['correct_answer'] = line.replace('<!-- correct -->', '').strip()
                        options.append(line.replace('<!-- correct -->', '').strip())
            card['options'] = options
            
            # Extract explanation
            back_match = re.search(r'<!--\s*back\s*-->(.*?)(?=<!--\s*tags|$)', block, re.DOTALL)
            if back_match:
                card['back'] = back_match.group(1).strip()
        
        elif card.get('type') == 'image-occlusion':
            # Extract image and masked areas
            front_match = re.search(r'<!--\s*front\s*-->(.*?)(?=<!--\s*masked-areas|$)', block, re.DOTALL)
            if front_match:
                card['front'] = front_match.group(1).strip()
            
            masked_match = re.search(r'<!--\s*masked-areas\s*-->(.*?)(?=<!--\s*back|$)', block, re.DOTALL)
            if masked_match:
                card['masked_areas'] = [area.strip('[]').strip() for area in masked_match.group(1).strip().split('\n') if area.strip()]
            
            back_match = re.search(r'<!--\s*back\s*-->(.*?)(?=<!--\s*tags|$)', block, re.DOTALL)
            if back_match:
                card['back'] = back_match.group(1).strip()
        
        elif card.get('type') == 'fill-in-the-blank':
            front_match = re.search(r'<!--\s*front\s*-->(.*?)(?=<!--\s*back|$)', block, re.DOTALL)
            back_match = re.search(r'<!--\s*back\s*-->(.*?)(?=<!--\s*tags|$)', block, re.DOTALL)
            
            if front_match:
                card['front'] = front_match.group(1).strip()
            if back_match:
                card['back'] = back_match.group(1).strip()
                # Split answers if comma-separated
                card['answers'] = [ans.strip() for ans in card['back'].split(',')]
        
        else:  # Basic, reversed, and other types
            front_match = re.search(r'<!--\s*front\s*-->(.*?)(?=<!--\s*back|$)', block, re.DOTALL)
            back_match = re.search(r'<!--\s*back\s*-->(.*?)(?=<!--\s*tags|$)', block, re.DOTALL)
            
            if front_match:
                card['front'] = front_match.group(1).strip()
            if back_match:
                card['back'] = back_match.group(1).strip()
        
        # Extract tags
        tags_match = re.search(r'<!--\s*tags:\s*(.*?)\s*-->', block)
        if tags_match:
            card['tags'] = tags_match.group(1).strip()
        
        if card:  # Only add if we have content
            cards.append(card)
    
    return cards
