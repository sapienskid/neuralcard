import genanki
import html
import re
from typing import Dict, List, Any
from util.direct_parser import simple_markdown_to_html, create_interactive_script

# Constants for styling and colors
CORRECT_COLOR = "#2ecc71"
INCORRECT_COLOR = "#e74c3c"
CORRECT_BG = "rgba(46, 204, 113, 0.1)"
INCORRECT_BG = "rgba(231, 76, 60, 0.05)"
CHECK_ICON = "✓"
CROSS_ICON = "✗"

def create_basic_note(card: Dict[str, Any], model: genanki.Model, tags: List[str]) -> genanki.Note:
    """Create a basic front/back note."""
    front_html = simple_markdown_to_html(card.get('front', ''))
    back_html = simple_markdown_to_html(card.get('back', ''))

    return genanki.Note(
        model=model,
        fields=[card.get('tags', ''), front_html, back_html, ""],
        tags=tags
    )

def create_cloze_note(card: Dict[str, Any], model: genanki.Model, tags: List[str]) -> genanki.Note:
    """Create a cloze deletion note with consistent styling.

    Args:
        card: Dictionary containing card data with 'front' and 'tags' keys
        model: Anki model to use for the note
        tags: List of tags to apply to the note

    Returns:
        genanki.Note: Configured cloze note ready for deck addition
    """
    front = card.get('front', '')
    category = card.get('tags', '')

    if '{{c' not in front:
        front = convert_cloze_format(front)

    front_html = f"""
    <div class="cloze-section">
        <div class="question-content">
            {simple_markdown_to_html(front)}
        </div>
        <div class="tags-container">
            {' '.join(f'<span class="tag">{tag}</span>' for tag in tags)}
        </div>
    </div>
    """

    return genanki.Note(
        model=model,
        fields=[front_html, "", category],
        tags=tags
    )

def create_multiple_choice_note(card, model, tags):
    """Create a multiple choice question note with improved feedback."""
    question = card.get('front', '')
    options = card.get('options', [])
    correct_answer = card.get('correct_answer', '').strip()
    category = card.get('tags', '')

    question_html = simple_markdown_to_html(question)
    script = create_interactive_script('mcq')

    # Generate options HTML
    options_html = _generate_mcq_options_html(options, correct_answer)

    front_content = (
        f"{script}<div class='mcq-section'>"
        f"<div class='mcq-question'>{question_html}</div>"
        f"<div class='multiple-choice' id='mcq-options'>"
        f"{options_html}</div></div>"
    )

    # Generate answer reveal HTML
    answer_html = _generate_mcq_answer_html(question_html, options, correct_answer)

    return genanki.Note(
        model=model,
        fields=[category, question_html, front_content, answer_html, ""],
        tags=tags
    )

def create_true_false_note(card, model, tags):
    """Create a true/false question note with properly escaped HTML."""
    front_html = simple_markdown_to_html(card.get('front', ''))
    back_html = simple_markdown_to_html(card.get('back', ''))
    correct_answer = card.get('correct_answer', 'True')
    category = card.get('tags', '')

    is_true_correct = correct_answer == "True"
    is_false_correct = not is_true_correct

    # Add interactive buttons
    front_html += _generate_tf_buttons_html(is_true_correct, is_false_correct)

    # Add correct answer to back
    back_html += f"<p><strong>Correct answer:</strong> {html.escape(correct_answer)}</p>"

    # Generate JavaScript for interactivity
    script = _generate_tf_javascript()

    return genanki.Note(
        model=model,
        fields=[category, front_html, back_html, script],
        tags=tags
    )

def create_reversed_note(card, model, tags):
    """Create a reversed note where front/back are swapped."""
    front_html = simple_markdown_to_html(card.get('front', ''))
    back_html = simple_markdown_to_html(card.get('back', ''))

    return genanki.Note(
        model=model,
        fields=[card.get('tags', ''), back_html, front_html, ""],
        tags=tags
    )

def create_image_occlusion_note(card, model, tags):
    """Create an image occlusion note."""
    front_html = simple_markdown_to_html(card.get('front', ''))
    back_html = simple_markdown_to_html(card.get('back', ''))
    category = card.get('tags', '')

    masked_areas_raw = card.get('masked_areas', '')

    # Parse masked areas efficiently
    masked_areas = []
    if isinstance(masked_areas_raw, list):
        masked_areas = masked_areas_raw
    elif isinstance(masked_areas_raw, str):
        # Simple regex to extract coordinates
        coords = re.findall(r'\[([^\]]+)\]', masked_areas_raw)
        for coord in coords:
            try:
                values = [int(x.strip()) for x in re.split(r'[\s,]+', coord) if x.strip()]
                if len(values) >= 4:
                    masked_areas.append(values[:4])
            except (ValueError, TypeError):
                continue

    # Generate occlusion HTML efficiently
    if masked_areas:
        occlusion_divs = ''.join(
            f'<div class="occlusion-rect" style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{h}px;background-color:black;"></div>'
            for x, y, w, h in masked_areas
        )
        front_html += f'<div class="image-occlusion-container" style="position:relative;">{occlusion_divs}</div>'

    return genanki.Note(
        model=model,
        fields=[category, front_html, back_html, ""],
        tags=tags
    )

def create_audio_note(card, model, tags):
    """Create a note with audio embedded."""
    front_html = process_audio_references(simple_markdown_to_html(card.get('front', '')))
    back_html = simple_markdown_to_html(card.get('back', ''))

    return genanki.Note(
        model=model,
        fields=[card.get('tags', ''), front_html, back_html, ""],
        tags=tags
    )

# Helper functions

def _generate_mcq_options_html(options, correct_answer):
    """Generate HTML for multiple choice options."""
    options_list = []
    for option in options:
        option_html = simple_markdown_to_html(option)
        is_correct = option.strip() == correct_answer
        correct_str = "true" if is_correct else "false"
        options_list.append(
            f'<div class="mcq-option" onclick="checkMCQAnswer(this, {correct_str})">'
            f'<div class="mcq-option-content">'
            f'<span class="mcq-option-text">{option_html}</span>'
            f'<span class="mcq-result-icon"></span>'
            f'</div></div>'
        )
    return ' '.join(options_list)

def _generate_mcq_answer_html(question_html, options, correct_answer):
    """Generate HTML for multiple choice answer reveal."""
    answer_list = []
    for option in options:
        option_html = simple_markdown_to_html(option)
        is_correct = option.strip() == correct_answer
        color = CORRECT_COLOR if is_correct else INCORRECT_COLOR
        icon = CHECK_ICON if is_correct else CROSS_ICON
        bg_color = CORRECT_BG if is_correct else INCORRECT_BG
        option_class = "opt-correct" if is_correct else "opt-incorrect"

        answer_list.append(
            f'<div class="{option_class} mcq-option" style="border-color: {color}; background: {bg_color};">'
            f'<div class="mcq-option-content">'
            f'<span class="mcq-option-text">{option_html}</span>'
            f'<span class="mcq-result-icon" style="color: {color};">{icon}</span>'
            f'</div></div>'
        )

    return (
        f"<div class='mcq-section'>"
        f"<div class='mcq-question'>{question_html}</div>"
        f"<div class='multiple-choice answer-reveal'>"
        f"{' '.join(answer_list)}</div></div>"
    )

def _generate_tf_buttons_html(is_true_correct, is_false_correct):
    """Generate HTML for true/false buttons."""
    return (
        f'<div class="true-false-container">'
        f'<div class="tf-button" id="true-btn" data-correct="{str(is_true_correct).lower()}">True</div>'
        f'<div class="tf-button" id="false-btn" data-correct="{str(is_false_correct).lower()}">False</div>'
        f'</div>'
    )

def _generate_tf_javascript():
    """Generate JavaScript for true/false interactivity."""
    return (
        '<script>'
        'document.addEventListener("DOMContentLoaded",function(){'
        'var t=document.getElementById("true-btn"),f=document.getElementById("false-btn");'
        'if(t&&f){t.onclick=function(){checkTF("true")};f.onclick=function(){checkTF("false")}}'
        '});'
        'function checkTF(s){'
        'document.querySelectorAll(".tf-button").forEach(function(b){'
        'b.style.pointerEvents="none";'
        'if(b.getAttribute("data-correct")==="true")b.style.backgroundColor="#4CAF50",b.style.color="white";'
        'else if(b.id===s+"-btn"&&b.getAttribute("data-correct")==="false")b.style.backgroundColor="#f44336",b.style.color="white"'
        '})}'
        '</script>'
    )

def convert_cloze_format(text: str) -> str:
    """Convert {{text}} to {{c1::text}} format for Anki cloze cards.

    Args:
        text: Input text containing cloze deletions in {{}} format

    Returns:
        str: Text with proper Anki cloze format
    """
    if re.search(r'{{c\d+::.*?}}', text):
        return text

    cloze_count = 1
    lines = text.split('\n')
    result_lines = []

    for line in lines:
        if line.strip().startswith('```'):
            result_lines.append(line)
        elif '{{' in line and '}}' in line:
            line = re.sub(r'{{(.*?)}}', lambda m: f'{{{{c{cloze_count}::{m.group(1)}}}}}', line)
            cloze_count += 1
            result_lines.append(line)
        else:
            result_lines.append(line)

    return '\n'.join(result_lines)

def process_audio_references(html_text: str) -> str:
    """Process audio references in HTML to ensure they work in Anki.

    Args:
        html_text: HTML content that may contain audio references

    Returns:
        str: HTML with standardized Anki audio references
    """
    return re.sub(r'\[(?:audio|sound):(.*?)\]', r'[sound:\1]', html_text)
