#!/usr/bin/env python3

import sys
import os
import traceback
from pathlib import Path
import argparse
import time

# Get the directory containing the script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Add the script directory to Python path
sys.path.insert(0, script_dir)

# Set up argument parser
parser = argparse.ArgumentParser(description='Create Anki flashcards from Obsidian notes')
parser.add_argument('note_path', help='Path to the Obsidian note')
parser.add_argument('deck_folder', help='Folder where to save the Anki deck')
parser.add_argument('deck_name', help='Name of the Anki deck')
parser.add_argument('tags', help='Comma-separated list of tags to add to all cards')
parser.add_argument('--debug', action='store_true', help='Enable debug mode with verbose logging')
parser.add_argument('--card-style', dest='card_style', default='default',
                    help='Card style to use (default, retro, minimal, dark, colorful)')

# Parse arguments
args = parser.parse_args()
debug_mode = args.debug or os.environ.get('DEBUG_MODE') == '1'

# Set up logging first
try:
    # Create logs directory
    log_dir = Path(script_dir) / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    
    from util.logger import initialize_logger, get_logger
    logger = initialize_logger(log_dir, debug_level=debug_mode)
    logger.info("Starting flashcard creation process...")
    
    # Log arguments in debug mode
    if debug_mode:
        logger.debug(f"Arguments: {args}")
        logger.debug(f"Python version: {sys.version}")
        logger.debug(f"Script directory: {script_dir}")
    
except ImportError:
    print("Failed to set up logging, continuing with basic error handling")
    import logging
    logging.basicConfig(level=logging.DEBUG if debug_mode else logging.INFO)
    logger = logging.getLogger("flashcard_maker")

try:
    from util.markdown_parser import parse_markdown
    from util.card_validator import validate_card
    from util.exception_handler import handle_exception, ParsingException, ValidationException, DeckCreationException
    from python_card_script import create_anki_deck, create_emergency_deck
    from util.styling import get_card_styles
    logger.info("Successfully imported required modules")
except ImportError as e:
    error_msg = f"Import error: {e}"
    logger.critical(error_msg)
    print(error_msg, file=sys.stderr)
    sys.exit(1)

# Template with MathJax initialization for proper LaTeX rendering
DEFAULT_TEMPLATE = {
    "Front": '<div class="front-side">{{Front}}</div>',
    "Back": '<div class="front-side">{{FrontSide}}</div><hr id="answer"><div class="back-side">{{Back}}</div>'
}

def main(note_path, deck_folder, deck_name, tag_string, card_style, debug=False):
    """Main function to create flashcards from a note."""
    start_time = time.time()
    error_recovery_needed = False
    error_message = ""
    
    try:
        # Log starting of processing
        logger.info(f"Processing note: {note_path}")
        logger.info(f"Creating deck: {deck_name}")
        logger.info(f"Using tags: {tag_string}")
        logger.info(f"Using card style: {card_style}")  # Add this log
        
        # Parse global tags (from command line)
        global_tags = [tag.strip() for tag in tag_string.split(',') if tag.strip()]
        logger.info(f"Parsed global tags: {global_tags}")
        
        # Read the note content
        try:
            with open(note_path, "r", encoding="utf-8") as f:
                content = f.read()
            logger.info(f"Successfully read note with {len(content)} characters")
            
            if debug:
                # Log first 100 chars in debug mode
                logger.debug(f"Note content preview: {content[:100]}...")
                
        except Exception as e:
            error_msg, is_critical = handle_exception(e, "reading note file")
            if is_critical:
                raise DeckCreationException(error_msg) from e
            logger.warning(error_msg)
            content = f"<!-- front -->\nError reading note content: {str(e)}\n<!-- back -->\nPlease check file permissions and encoding."
        
        # Parse markdown and get cards
        try:
            cards = parse_markdown(content)
            logger.info(f"Found {len(cards)} cards in note")
            
            if debug:
                # Log card types in debug mode
                card_types = {}
                for card in cards:
                    card_type = card.get('type', 'unknown')
                    card_types[card_type] = card_types.get(card_type, 0) + 1
                logger.debug(f"Card types found: {card_types}")
                
        except Exception as e:
            error_msg, is_critical = handle_exception(e, "parsing markdown")
            if is_critical:
                raise ParsingException(error_msg) from e
            logger.warning(error_msg)
            cards = [{'type': 'basic', 'front': 'Error parsing note content', 'back': str(e), 'tags': 'error'}]
        
        # Create deck folder if it doesn't exist
        try:
            if not os.path.exists(deck_folder):
                os.makedirs(deck_folder)
                logger.info(f"Created deck folder: {deck_folder}")
        except Exception as e:
            error_msg, is_critical = handle_exception(e, "creating deck folder")
            if is_critical:
                raise DeckCreationException(error_msg) from e
            logger.warning(error_msg)
            # Will try to use current directory as fallback
            deck_folder = "."
        
        # Validate cards
        valid_cards = []
        for card in cards:
            try:
                is_valid, fixed_card = validate_card(card)
                if is_valid and fixed_card:
                    # IMPORTANT: The tuple is being extracted here instead of passing directly
                    valid_cards.append(fixed_card)
                else:
                    logger.warning(f"Skipping invalid card: {card}")
            except Exception as e:
                error_msg, _ = handle_exception(e, f"validating card {card.get('type', 'unknown')}")
                logger.warning(error_msg)
        
        logger.info(f"{len(valid_cards)} cards passed validation")
        
        # Default spaced repetition settings
        spaced_rep_settings = {
            'initial_ease': 250,
            'interval_modifier': 1.0
        }
        
        # Create and save the deck
        try:
            styling = {
                'card_style': card_style,
                'css': get_card_styles(card_style)
            }
            
            deck = create_anki_deck(
                deck_name=deck_name,
                cards=valid_cards,
                styling=styling,  # Pass the complete styling object
                tags=global_tags,
                description="Created with Obsidian Flashcard Maker",
                audio_dir=deck_folder,
                spaced_rep_settings=spaced_rep_settings,
                template=DEFAULT_TEMPLATE
            )
            
            if not deck:
                logger.error("Deck creation returned None")
                error_recovery_needed = True
                error_message = "Failed to create Anki deck object"
                raise DeckCreationException("Failed to create Anki deck")
                
            # Save the deck
            output_path = os.path.join(deck_folder, f"{deck_name}.apkg")
            deck.write_to_file(output_path)
            logger.info(f"Deck created successfully: {output_path}")
            print(f"Deck created successfully: {output_path}")
            
        except Exception as e:
            error_msg, is_critical = handle_exception(e, "creating deck")
            logger.error(error_msg)
            error_recovery_needed = True
            error_message = str(e)
            raise DeckCreationException(error_msg) from e
        
    except Exception as e:
        logger.critical(f"Error: {str(e)}")
        traceback.print_exc()
        print(f"Error: {str(e)}", file=sys.stderr)
        error_recovery_needed = True
        error_message = str(e)
        sys.exit(1)
    finally:
        # Log total processing time
        elapsed_time = time.time() - start_time
        logger.info(f"Total processing time: {elapsed_time:.2f} seconds")
        
        if error_recovery_needed:
            # Try to create an emergency deck with error info
            try:
                logger.warning("Creating emergency deck with error info")
                emergency_deck = create_emergency_deck(deck_name, error_message)
                if emergency_deck:
                    emergency_path = os.path.join(deck_folder, f"{deck_name}_ERROR.apkg")
                    emergency_deck.write_to_file(emergency_path)
                    logger.info(f"Emergency deck created: {emergency_path}")
                    print(f"An error occurred, but an emergency deck was created: {emergency_path}", file=sys.stderr)
            except Exception as e:
                logger.critical(f"Failed to create emergency deck: {str(e)}")

if __name__ == "__main__":
    main(args.note_path, args.deck_folder, args.deck_name, args.tags, args.card_style, args.debug)
