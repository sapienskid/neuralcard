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
                    help='Card style to use (default)')
parser.add_argument('--custom-css', dest='custom_css', default='',
                    help='Additional custom CSS to apply to cards')

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

def main(note_path, deck_folder, deck_name, tag_string, card_style, custom_css='', debug=False):
    """Main function to create flashcards from a note."""
    start_time = time.time()

    try:
        logger.info(f"Processing note: {note_path}")
        logger.info(f"Creating deck: {deck_name}")

        global_tags = [tag.strip() for tag in tag_string.split(',') if tag.strip()]
        logger.info(f"Using tags: {global_tags}")

        # Read note content
        try:
            with open(note_path, "r", encoding="utf-8") as f:
                content = f.read()
            logger.info(f"Read note with {len(content)} characters")
        except Exception as e:
            error_msg, is_critical = handle_exception(e, "reading note file")
            if is_critical:
                raise DeckCreationException(error_msg) from e
            content = f"<!-- front -->\nError reading note: {str(e)}\n<!-- back -->\nCheck file permissions."

        # Parse markdown
        try:
            cards = parse_markdown(content)
            logger.info(f"Found {len(cards)} cards")
            if debug:
                card_types = {}
                for card in cards:
                    card_types[card.get('type', 'unknown')] = card_types.get(card.get('type', 'unknown'), 0) + 1
                logger.debug(f"Card types: {card_types}")
        except Exception as e:
            error_msg, is_critical = handle_exception(e, "parsing markdown")
            if is_critical:
                raise ParsingException(error_msg) from e
            cards = [{'type': 'basic', 'front': 'Error parsing content', 'back': str(e), 'tags': 'error'}]

        # Create deck folder
        os.makedirs(deck_folder, exist_ok=True)

        # Validate cards
        valid_cards, rejected_cards, auto_corrected = [], [], 0
        validation_issues = {}

        for idx, card in enumerate(cards):
            try:
                is_valid, fixed_card = validate_card(card)
                if is_valid and fixed_card:
                    valid_cards.append(fixed_card)
                    # Check for auto-correction
                    if any(card.get(k) != fixed_card.get(k) for k in ['type', 'front', 'back']):
                        auto_corrected += 1
                else:
                    rejected_cards.append(card)
                    card_type = card.get('type', 'unknown')
                    validation_issues[card_type] = validation_issues.get(card_type, 0) + 1
                    logger.warning(f"Card {idx+1} rejected: {card_type}")
            except Exception as e:
                logger.warning(f"Validation error for card {idx+1}: {str(e)}")
                rejected_cards.append(card)

        # Log validation results
        print(f"{len(valid_cards)} valid, {len(rejected_cards)} rejected, {auto_corrected} auto-corrected")
        logger.info(f"Validation: {len(valid_cards)} valid, {len(rejected_cards)} rejected, {auto_corrected} corrected")

        if not valid_cards:
            error_msg = "No valid cards found" if cards else "No cards found in note"
            logger.error(error_msg)
            raise ValidationException(error_msg)

        # Create deck
        styling = {'card_style': card_style, 'css': get_card_styles(card_style, custom_css)}
        spaced_rep_settings = {'initial_ease': 250, 'interval_modifier': 1.0}

        deck = create_anki_deck(
            deck_name=deck_name,
            cards=valid_cards,
            styling=styling,
            tags=global_tags,
            description="Created with Obsidian Flashcard Maker",
            audio_dir=deck_folder,
            spaced_rep_settings=spaced_rep_settings,
            template=DEFAULT_TEMPLATE
        )

        if not deck:
            raise DeckCreationException("Failed to create deck")

        # Save deck
        output_path = os.path.join(deck_folder, f"{deck_name}.apkg")
        deck.write_to_file(output_path)
        logger.info(f"Deck saved: {output_path}")
        print(f"Deck created: {output_path}")
        print(f"Created {len(valid_cards)} cards")

    except Exception as e:
        logger.critical(f"Error: {str(e)}")
        traceback.print_exc()
        print(f"Error: {str(e)}", file=sys.stderr)

        # Emergency deck creation
        try:
            emergency_deck = create_emergency_deck(deck_name, str(e))
            if emergency_deck:
                emergency_path = os.path.join(deck_folder, f"{deck_name}_ERROR.apkg")
                emergency_deck.write_to_file(emergency_path)
                print(f"Emergency deck created: {emergency_path}", file=sys.stderr)
        except Exception:
            pass

        sys.exit(1)
    finally:
        elapsed_time = time.time() - start_time
        logger.info(f"Processing time: {elapsed_time:.2f}s")

if __name__ == "__main__":
    main(args.note_path, args.deck_folder, args.deck_name, args.tags, args.card_style, args.custom_css, args.debug)
