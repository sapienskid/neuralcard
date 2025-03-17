import genanki
import random
import re
import os
from util.direct_parser import simple_markdown_to_html
import traceback
from util.logger import get_logger
from util.styling import get_card_styles

from basic_card_handlers import (
    create_basic_note, create_cloze_note, create_audio_note,
    create_true_false_note,
    create_image_occlusion_note,
    create_reversed_note,
    create_multiple_choice_note
)

# Get the logger
logger = get_logger()

# Define models
BASIC_MODEL = genanki.Model(
    random.randrange(1 << 30, 1 << 31),
    'Basic Card',
    fields=[
        {'name': 'Category'},
        {'name': 'Front'},
        {'name': 'Back'},
        {'name': 'UseScript'}
    ],
    templates=[
        {
            'name': 'Card',
            'qfmt': '{{Front}}{{#UseScript}}<script>{{UseScript}}</script>{{/UseScript}}',
            'afmt': '{{FrontSide}}<hr id="answer">{{Back}}'
        },
    ])

CLOZE_MODEL = genanki.Model(
    random.randrange(1 << 30, 1 << 31),
    'Cloze Card',
    fields=[
        {'name': 'Category'},
        {'name': 'Text'},
        {'name': 'Extra'},  # This will be left empty for cloze cards
        {'name': 'UseScript'}
    ],
    templates=[
        {
            'name': 'Cloze',
            'qfmt': '{{cloze:Text}}',  # Don't include any back content in the question
            'afmt': '{{cloze:Text}}'   # Just show the revealed cloze in the answer
        }
    ],
    model_type=genanki.Model.CLOZE)

MCQ_MODEL = genanki.Model(
    random.randrange(1 << 30, 1 << 31),
    'Multiple Choice Card',
    fields=[
        {'name': 'Category'},
        {'name': 'Question'},
        {'name': 'Options'},
        {'name': 'Answer'},
        {'name': 'UseScript'}
    ],
    templates=[{
        'name': 'Multiple Choice',
        'qfmt': """
        <div class="content">
            <div class="category">{{Category}}</div>
            <div class="mcq-options">{{Options}}</div>
            {{#UseScript}}<script>{{UseScript}}</script>{{/UseScript}}
        </div>
        """,
        'afmt': """
        <div class="content">
            <div class="category">{{Category}}</div>
            <div class="mcq-answer">{{Answer}}</div>
        </div>
        """
    }],
    css=get_card_styles()
)

def register_card_handlers():
    """Register all card type handlers in a dictionary for easy lookup."""
    return {
        # Core card types
        'basic': create_basic_note,
        'cloze': create_cloze_note,
        'multiple-choice': create_multiple_choice_note,
        'mcq': create_multiple_choice_note,
        'reversed': create_reversed_note,
        'basic-and-reversed': create_reversed_note,
        'image-occlusion': create_image_occlusion_note,
        'fill-in-the-blank': create_cloze_note,  # Handled as cloze
        'audio': create_audio_note,
        'true-false': create_true_false_note,  # Now using the specialized handler

        # Map all specialized types to basic handler
        'math': create_basic_note,
        'spelling': create_basic_note,
        'timeline': create_basic_note,
        'matching': create_basic_note,
        'ordering': create_basic_note,
        'short-answer': create_basic_note,
    }


def create_anki_deck(
    deck_name: str,
    cards: list,
    styling: dict,
    tags: list,
    description: str,
    audio_dir: str,
    spaced_rep_settings: dict,
    template: dict
) -> genanki.Package:
    """Creates an Anki deck with enhanced features including multiple choice and cloze deletions."""
    try:
        model_id = random.randrange(1 << 30, 1 << 31)
        deck_id = random.randrange(1 << 30, 1 << 31)

        # Validate inputs
        if not isinstance(cards, list):
            print(f"Warning: Expected cards to be a list, got {type(cards)}")
            cards = []
        if not isinstance(tags, list):
            print(f"Warning: Expected tags to be a list, got {type(tags)}")
            tags = []
        if not isinstance(styling, dict) or 'css' not in styling:
            print(f"Warning: Invalid styling object, using default")
            styling = {'css': ''}
        if not isinstance(template, dict) or 'Front' not in template or 'Back' not in template:
            print(f"Warning: Invalid template object, using default")
            template = {
                "Front": '<div class="front-side">{{Front}}</div>',
                "Back": '<div class="front-side">{{FrontSide}}</div><hr id="answer"><div class="back-side">{{Back}}</div>'
            }

        # Get the card style and CSS from styling dict
        card_style = styling.get('card_style', 'default')
        css = styling.get('css') or get_card_styles(card_style)
        
        logger.info(f"Creating deck with style: {card_style}")

        # Create regular model for most card types
        try:
            regular_model = genanki.Model(
                model_id,
                'Enhanced Interactive Model',
                fields=[
                    {'name': 'Category'},
                    {'name': 'Front'},
                    {'name': 'Back'},
                    {'name': 'UseScript'}  # Field for optional script
                ],
                templates=[{
                    'name': 'Card 1',
                    'qfmt': """
                    <div class="content">
                        <div class="category">{{Category}}</div>
                        <div class="front">{{Front}}</div>
                        {{#UseScript}}<script>{{UseScript}}</script>{{/UseScript}}
                    </div>
                    """,
                    'afmt': """
                    <div class="content">
                        <div class="category">{{Category}}</div>
                        <div class="front">{{Front}}</div>
                        <hr>
                        <div class="back">{{Back}}</div>
                        {{#UseScript}}<script>{{UseScript}}</script>{{/UseScript}}
                    </div>
                    """
                }],
                css=css  # Use the style-specific CSS
            )
            
            # Update other models to use the same CSS
            global BASIC_MODEL, CLOZE_MODEL, MCQ_MODEL
            BASIC_MODEL.css = css
            CLOZE_MODEL.css = css
            MCQ_MODEL.css = css
            
        except Exception as e:
            print(f"Error creating regular model: {str(e)}")
            traceback.print_exc()
            # Create a simplified model as fallback
            regular_model = BASIC_MODEL

        # Cloze model for cloze deletion cards - Note: has only 3 fields
        try:
            cloze_model = genanki.Model(
                model_id + 1,
                'Enhanced Cloze Model',
                fields=[
                    {'name': 'Text'},
                    {'name': 'Back'},
                    {'name': 'Category'}
                ],
                templates=[{
                    'name': 'Cloze',
                    'qfmt': """
                    <div class="content">
                        <div class="category">{{Category}}</div>
                        <div class="front">{{cloze:Text}}</div>
                        <div class="back">{{Back}}</div>
                    </div>
                    """,
                    'afmt': """
                    <div class="content">
                        <div class="category">{{Category}}</div>
                        <div class="front">{{cloze:Text}}</div>
                        <hr>
                        <div class="back">{{Back}}</div>
                    </div>
                    """
                }],
                model_type=1,  # This is important to indicate it's a cloze model
                css=css
            )
        except Exception as e:
            print(f"Error creating cloze model: {str(e)}")
            traceback.print_exc()
            # Create a simplified model as fallback
            cloze_model = CLOZE_MODEL

        # Create deck
        my_deck = genanki.Deck(deck_id, deck_name, description)

        # Create a card signature tracker to avoid duplicates
        card_signatures = set()

        # Register all card handlers
        card_handlers = register_card_handlers()

        # Process each card
        for card in cards:
            try:
                # Fix the tuple issue - if card is a tuple extract the dictionary
                # This ensures backward compatibility with both tuples and dictionaries
                if isinstance(card, tuple) and len(card) >= 2:
                    # Extract just the dictionary from the validation tuple
                    is_valid, card_dict = card
                    if not is_valid or not card_dict:
                        print(f"Skipping invalid card from tuple: {card}")
                        continue
                    card = card_dict  # Use the dictionary for further processing
                
                # Ensure we have a dictionary
                if not isinstance(card, dict):
                    print(f"Skipping non-dictionary card: {type(card)}")
                    continue
                
                card_type = card.get('type', 'basic').lower()
                
                print(f"Processing card of type: {card_type}")

                # Special debugging for fill-in-blank cards
                if card_type == 'fill-in-the-blank' or ('_____' in card.get('front', '')):
                    print(f"Found fill-in-blank card: {card.get('front', '')[:50]}...")
                    if '```' in card.get('front', ''):
                        print("This card has code blocks with blanks")

                # Create a signature for this card to avoid duplicates
                card_signature = f"{card_type}:{card.get('front', '')}:{card.get('back', '')}"
                if card_signature in card_signatures:
                    print(f"Skipping duplicate card: {card_signature[:50]}...")
                    continue

                # Add this card's signature to our tracker
                card_signatures.add(card_signature)

                # Parse the card's tags into a proper list
                card_tags = parse_tags(card.get('tags', ''))
                # Combine with the global tags
                combined_tags = tags + card_tags

                # Process audio references if present
                if 'audio' in card:
                    audio_ref = card['audio']
                    card['front'] = card.get(
                        'front', '') + f"\n\n{process_audio_file(audio_ref, audio_dir, my_deck)}"

                # Use the appropriate handler based on card type
                handler = card_handlers.get(card_type)

                if handler:
                    # Determine which model to use
                    if card_type in ['cloze', 'fill-in-the-blank']:
                        note = handler(card, cloze_model, combined_tags)
                    elif card_type in ['multiple-choice', 'mcq']:
                        note = handler(card, MCQ_MODEL, combined_tags)
                    else:
                        note = handler(card, regular_model, combined_tags)

                    if note:
                        my_deck.add_note(note)
                        print(f"Added note to deck: {card_type}")
                    else:
                        print(f"Warning: Handler for {card_type} returned None")
                else:
                    print(f"Warning: Unknown card type: {card_type}")
                    # Fall back to basic card
                    note = create_basic_note(card, regular_model, combined_tags)
                    my_deck.add_note(note)

            except Exception as e:
                import traceback
                print(f"Error processing card: {str(card)[:100]}...")
                print(f"Error details: {str(e)}")
                print(traceback.format_exc())
                continue

        return genanki.Package(my_deck)
    except Exception as e:
        print(f"Error creating Anki deck: {str(e)}")
        traceback.print_exc()
        return create_emergency_deck(deck_name, str(e))


def parse_tags(tag_string):
    """Convert a comma-separated tag string into a list of clean tags."""
    if not tag_string:
        return []
    # Split by commas and clean each tag
    return [tag.strip() for tag in tag_string.split(',') if tag.strip()]


def process_audio_file(audio_ref, audio_dir, deck):
    """Process audio files for Anki cards."""
    if audio_dir and os.path.exists(os.path.join(audio_dir, audio_ref)):
        audio_path = os.path.join(audio_dir, audio_ref)
        # Create media files list if it doesn't exist
        if not hasattr(deck, 'media_files'):
            deck.media_files = []
        # Add to media files
        deck.media_files.append(audio_path)
        return f'[sound:{os.path.basename(audio_ref)}]'
    return f'[sound:{audio_ref}]'


def create_fill_blank_note(card, cloze_model, regular_model, combined_tags):
    """Create a note for fill-in-the-blank cards."""
    front = card.get('front', '')
    back = card.get('back', '')
    category = card.get('tags', '')

    # Convert directly to cloze if possible
    if '_____' in front and back:
        cloze_text = front.replace('_____', f'{{{{c1::{back.strip()}}}}}')
        
        # Process any code blocks in cloze deletions
        
        processed_text = simple_markdown_to_html(cloze_text)
        
        # Create a cloze note with three fields matching model definition
        return genanki.Note(
            model=cloze_model,
            fields=[processed_text, "", category],  # Text, Back, Category
            tags=combined_tags
        )
    else:
        # Fallback to basic card if no blank or answer
        front_html = simple_markdown_to_html(front)
        back_html = simple_markdown_to_html(back)
        
        return genanki.Note(
            model=regular_model,
            fields=[category, front_html, back_html, ""],
            tags=combined_tags
        )


def create_emergency_deck(deck_name: str, error_message: str) -> genanki.Package:
    """
    Create an emergency deck with a single card explaining the error.
    This ensures the user gets some feedback even if the main process fails.
    """
    try:
        model_id = random.randrange(1 << 30, 1 << 31)
        deck_id = random.randrange(1 << 30, 1 << 31)
        
        # Create a simple model
        model = genanki.Model(
            model_id,
            'Emergency Model',
            fields=[
                {'name': 'Front'},
                {'name': 'Back'}
            ],
            templates=[{
                'name': 'Card 1',
                'qfmt': '{{Front}}',
                'afmt': '{{FrontSide}}<hr id="answer">{{Back}}'
            }],
            css=".card { font-family: Arial; font-size: 20px; text-align: center; color: black; background-color: white; } .error { color: red; }"
        )
        
        # Create deck
        deck = genanki.Deck(deck_id, f"{deck_name} (Error Recovery)", "Error recovery deck")
        
        # Create a note with the error message
        note = genanki.Note(
            model=model,
            fields=[
                "Error during flashcard creation",
                f'<div class="error">The following error occurred while creating your flashcards:</div><br><pre>{error_message}</pre><br>Please check the log for more details.'
            ]
        )
        
        deck.add_note(note)
        return genanki.Package(deck)
    except Exception as e:
        logger.critical(f"Even the emergency deck creation failed: {str(e)}")
        # As a last resort, create the most basic possible deck
        try:
            basic_deck = genanki.Deck(1234567890, f"{deck_name} (Error)", "Error")
            basic_model = genanki.Model(
                1234567890,
                'Basic',
                fields=[{'name': 'Front'}, {'name': 'Back'}],
                templates=[{
                    'name': 'Card',
                    'qfmt': '{{Front}}',
                    'afmt': '{{FrontSide}}<hr>{{Back}}'
                }]
            )
            basic_note = genanki.Note(
                model=basic_model,
                fields=["Error", "Failed to create flashcards."]
            )
            basic_deck.add_note(basic_note)
            return genanki.Package(basic_deck)
        except:
            # Nothing more we can do
            return None
