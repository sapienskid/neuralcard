import genanki
import html
from util.direct_parser import simple_markdown_to_html
import re
from util.exception_handler import (
    sanitize_tags, sanitize_options, sanitize_coordinates,
    safe_get_card_field, normalize_boolean_field,
    handle_exception, clean_field_content
)
from util.logger import get_logger

# Get logger
logger = get_logger()

@handle_exception
def create_basic_note(card, model, tags):
    """Create a basic front/back note with robust error handling.
    
    This handler also handles math content, as Anki natively supports LaTeX/MathJax.
    """
    # Safely get card fields with proper defaults
    front = safe_get_card_field(card, 'front', '')
    back = safe_get_card_field(card, 'back', '')
    category = safe_get_card_field(card, 'tags', '')
    
    # Clean and convert content
    front_html = clean_field_content(simple_markdown_to_html(front), is_html=True)
    back_html = clean_field_content(simple_markdown_to_html(back), is_html=True)
    
    # Sanitize tags
    safe_tags = sanitize_tags(tags)
    
    try:
        return genanki.Note(
            model=model,
            fields=[category, front_html, back_html, ""],
            tags=safe_tags
        )
    except Exception as e:
        logger.error(f"Error creating basic note: {str(e)}")
        # Try a fallback approach with minimal content
        try:
            return genanki.Note(
                model=model,
                fields=["", front, back, ""],
                tags=[]
            )
        except Exception:
            logger.error("Failed to create basic note even with fallback approach")
            return None

@handle_exception
def create_cloze_note(card, model, tags):
    """Create a cloze deletion note with consistent styling."""
    front = safe_get_card_field(card, 'front', '')
    category = safe_get_card_field(card, 'tags', '')
    
    # Process cloze content
    if '{{c' not in front:
        front = convert_cloze_format(front)
    
    # Clean and sanitize content
    front_html = clean_field_content(simple_markdown_to_html(front), is_html=True)
    
    # Sanitize tags
    safe_tags = sanitize_tags(tags)
    
    # Convert to HTML with consistent styling
    try:
        # Format with tags display if tags exist
        tags_display = ""
        if safe_tags:
            tags_display = '<div class="tags-container">' + ' '.join(f'<span class="tag">{tag}</span>' for tag in safe_tags) + '</div>'
        
        formatted_html = f"""
        <div class="cloze-section">
            <div class="question-content">
                {front_html}
            </div>
            {tags_display}
        </div>
        """
        
        return genanki.Note(
            model=model,
            fields=[formatted_html, "", category],
            tags=safe_tags
        )
    except Exception as e:
        logger.error(f"Error creating cloze note: {str(e)}")
        # Try a fallback approach with minimal content
        try:
            return genanki.Note(
                model=model,
                fields=[front, "", ""],
                tags=[]
            )
        except:
            logger.error("Failed to create cloze note even with fallback approach")
            return None

@handle_exception
def create_multiple_choice_note(card, model, tags):
    """Create a multiple choice question note with improved feedback."""
    # Safely get fields with proper defaults
    question = safe_get_card_field(card, 'front', 'Question')
    options_raw = card.get('options', [])
    correct_answer = safe_get_card_field(card, 'correct_answer', '')
    category = safe_get_card_field(card, 'tags', '')
    
    # Sanitize options
    options = sanitize_options(options_raw)
    
    # Ensure we have at least one option
    if not options:
        options = ["Option A", "Option B"]
        logger.warning("No options provided for multiple choice card, using defaults")
    
    # If no correct answer is specified, use the first option
    if not correct_answer and options:
        correct_answer = options[0]
        logger.warning("No correct answer specified, using first option as correct")
    
    # Clean and convert content
    question_html = clean_field_content(simple_markdown_to_html(question), is_html=True)
    
    # Sanitize tags
    safe_tags = sanitize_tags(tags)
    
    # JavaScript for interactive behavior
    script = """
    <script>
    function checkMCQAnswer(element, isCorrect) {
        // Mark the clicked element
        element.style.backgroundColor = isCorrect ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)';
        element.style.borderColor = isCorrect ? '#2ecc71' : '#e74c3c';
        
        // Show the icon
        var icon = element.querySelector('.mcq-result-icon');
        icon.textContent = isCorrect ? '✓' : '✗';
        icon.style.color = isCorrect ? '#2ecc71' : '#e74c3c';
        
        // Disable all options
        var options = document.querySelectorAll('.mcq-option');
        for (var i = 0; i < options.length; i++) {
            options[i].onclick = null;
            if (options[i] !== element) {
                options[i].style.opacity = '0.6';
            }
        }
    }
    </script>
    """
    
    try:
        # Create HTML for options (front)
        options_html = f"""
        <div class='mcq-section'>
            <div class='mcq-question'>{question_html}</div>
            <div class='multiple-choice' id='mcq-options'>"""
        
        # Include direct onclick handlers (most reliable in Anki)
        for i, option in enumerate(options):
            # Clean the option and convert to HTML
            option_html = clean_field_content(simple_markdown_to_html(option), is_html=True)
            
            # Check if this is the correct answer, using forgiving comparison
            is_correct = option.strip().lower() == correct_answer.strip().lower()
            correct_str = "true" if is_correct else "false"
            
            options_html += f"""
                <div class="mcq-option" onclick="checkMCQAnswer(this, {correct_str})">
                    <div class="mcq-option-content">
                        <span class="mcq-option-text">{option_html}</span>
                        <span class="mcq-result-icon"></span>
                    </div>
                </div>
            """
        
        options_html += "</div></div>"
        
        # Combine script with options (script needs to be before options for Anki)
        front_content = script + options_html

        # Create HTML for answer reveal (back)
        answer_html = f"<div class='mcq-section'><div class='mcq-question'>{question_html}</div>"
        answer_html += "<div class='multiple-choice answer-reveal'>"
        
        for option in options:
            option_html = clean_field_content(simple_markdown_to_html(option), is_html=True)
            is_correct = option.strip().lower() == correct_answer.strip().lower()
            option_style = "border-color: " + ("#2ecc71" if is_correct else "#e74c3c") + ";"
            icon = "✓" if is_correct else "✗"
            icon_color = "#2ecc71" if is_correct else "#e74c3c"
            background_color = "rgba(46, 204, 113, 0.1)" if is_correct else "rgba(231, 76, 60, 0.05)"
            
            # Also use classes instead of data attributes here for consistency
            option_class = f"mcq-option {'opt-correct' if is_correct else 'opt-incorrect'}"
            
            answer_html += f"""
            <div class="{option_class}" style="{option_style} background: {background_color};">
                <div class="mcq-option-content">
                    <span class="mcq-option-text">{option_html}</span>
                    <span class="mcq-result-icon" style="color: {icon_color};">{icon}</span>
                </div>
            </div>"""
        
        answer_html += "</div></div>"
        
        return genanki.Note(
            model=model,
            fields=[category, question_html, front_content, answer_html, ""],
            tags=safe_tags
        )
    except Exception as e:
        logger.error(f"Error creating multiple choice note: {str(e)}")
        # Try a fallback approach with minimal content
        try:
            simple_front = f"<p>{question}</p><p>Options: {', '.join(options)}</p>"
            simple_back = f"<p>Correct answer: {correct_answer}</p>"
            return genanki.Note(
                model=model,
                fields=[category, simple_front, "", simple_back, ""],
                tags=[]
            )
        except:
            logger.error("Failed to create multiple choice note even with fallback approach")
            return None

@handle_exception
def create_true_false_note(card, model, tags):
    """Create a true/false question note with properly escaped HTML."""
    # Safely get fields with proper defaults
    front = safe_get_card_field(card, 'front', '')
    back = safe_get_card_field(card, 'back', '')
    correct_answer_raw = card.get('correct_answer', 'True')
    category = safe_get_card_field(card, 'tags', '')
    
    # Normalize correct_answer to handle various input formats
    if isinstance(correct_answer_raw, bool):
        correct_answer = "True" if correct_answer_raw else "False"
    else:
        # Try to interpret strings like "t", "yes", "1" as True
        correct_answer_str = str(correct_answer_raw).strip().lower()
        if correct_answer_str in ['true', 't', 'yes', 'y', '1']:
            correct_answer = "True"
        else:
            correct_answer = "False"
    
    # Clean and convert content
    front_html = clean_field_content(simple_markdown_to_html(front), is_html=True)
    back_html = clean_field_content(simple_markdown_to_html(back), is_html=True)
    
    # Sanitize tags
    safe_tags = sanitize_tags(tags)
    
    # Calculate if True/False are correct
    is_true_correct = str(correct_answer == "True").lower()
    is_false_correct = str(correct_answer == "False").lower()
    
    try:
        front_html += f"""
        <div class="true-false-container">
          <div class="tf-button" id="true-btn" data-correct="{is_true_correct}">True</div>
          <div class="tf-button" id="false-btn" data-correct="{is_false_correct}">False</div>
        </div>
        """
        
        back_html += f"<p><strong>Correct answer:</strong> {html.escape(correct_answer)}</p>"
        
        # Add script for checking true/false answers
        script = """
        <script>
        document.addEventListener("DOMContentLoaded", function() {
            // Set up true/false buttons
            var trueBtn = document.getElementById('true-btn');
            var falseBtn = document.getElementById('false-btn');
            
            if (trueBtn && falseBtn) {
                trueBtn.addEventListener('click', function() {
                    checkTrueFalseAnswer('true');
                });
                
                falseBtn.addEventListener('click', function() {
                    checkTrueFalseAnswer('false');
                });
            }
        });
        
        function checkTrueFalseAnswer(selection) {
            var buttons = document.querySelectorAll('.tf-button');
            buttons.forEach(function(btn) {
                btn.style.pointerEvents = 'none'; // Disable further clicks
                
                if (btn.getAttribute('data-correct') === 'true') {
                    btn.style.backgroundColor = '#4CAF50';
                    btn.style.color = 'white';
                } else if (btn.id === selection + '-btn' && btn.getAttribute('data-correct') === 'false') {
                    btn.style.backgroundColor = '#f44336';
                    btn.style.color = 'white';
                }
            });
        }
        </script>
        """
        
        return genanki.Note(
            model=model,
            fields=[category, front_html, back_html, script],
            tags=safe_tags
        )
    except Exception as e:
        logger.error(f"Error creating true/false note: {str(e)}")
        # Try a fallback approach with minimal content 
        try:
            simple_front = f"<p>{front}</p><p>(True/False Question)</p>"
            simple_back = f"<p>Correct answer: {correct_answer}</p>"
            return genanki.Note(
                model=model,
                fields=[category, simple_front, simple_back, ""],
                tags=[]
            )
        except:
            logger.error("Failed to create true/false note even with fallback approach")
            return None

@handle_exception
def create_reversed_note(card, model, tags):
    """Create a reversed note where front/back are swapped with robust error handling."""
    # Safely get fields with proper defaults
    front = safe_get_card_field(card, 'front', '')
    back = safe_get_card_field(card, 'back', '')
    category = safe_get_card_field(card, 'tags', '')
    
    # Clean and convert content
    front_html = clean_field_content(simple_markdown_to_html(front), is_html=True)
    back_html = clean_field_content(simple_markdown_to_html(back), is_html=True)
    
    # Sanitize tags
    safe_tags = sanitize_tags(tags)
    
    try:
        # Create the reversed note (back content appears on front)
        return genanki.Note(
            model=model,
            fields=[category, back_html, front_html, ""],
            tags=safe_tags
        )
    except Exception as e:
        logger.error(f"Error creating reversed note: {str(e)}")
        # Try a fallback approach with minimal content
        try:
            return genanki.Note(
                model=model,
                fields=["", back, front, ""],
                tags=[]
            )
        except:
            logger.error("Failed to create reversed note even with fallback approach")
            return None

@handle_exception
def create_image_occlusion_note(card, model, tags):
    """Create an image occlusion note with robust error handling."""
    # Safely get fields with proper defaults
    front = safe_get_card_field(card, 'front', '')
    back = safe_get_card_field(card, 'back', '')
    category = safe_get_card_field(card, 'tags', '')
    
    # Get and sanitize masked areas
    masked_areas_raw = card.get('masked_areas', '')
    masked_areas = sanitize_coordinates(masked_areas_raw)
    
    # Clean and convert content
    front_html = clean_field_content(simple_markdown_to_html(front), is_html=True)
    back_html = clean_field_content(simple_markdown_to_html(back), is_html=True)
    
    # Sanitize tags
    safe_tags = sanitize_tags(tags)
    
    try:
        # Add masking divs for occluded areas
        if masked_areas:
            front_html += "<div class='image-occlusion-container' style='position: relative;'>"
            for area in masked_areas:
                if len(area) >= 4:
                    left, top, width, height = area[:4]
                    front_html += f"<div class='occlusion-rect' style='position: absolute; left: {left}px; top: {top}px; width: {width}px; height: {height}px; background-color: black;'></div>"
            front_html += "</div>"
        
        return genanki.Note(
            model=model,
            fields=[category, front_html, back_html, ""],
            tags=safe_tags
        )
    except Exception as e:
        logger.error(f"Error creating image occlusion note: {str(e)}")
        # Try a fallback approach with minimal content
        try:
            # Create a simple card without occlusions as fallback
            return genanki.Note(
                model=model,
                fields=["", front, back, ""],
                tags=[]
            )
        except:
            logger.error("Failed to create image occlusion note even with fallback approach")
            return None

@handle_exception
def create_audio_note(card, model, tags):
    """Create a note with audio embedded with robust error handling."""
    # Safely get fields with proper defaults
    front = safe_get_card_field(card, 'front', '')
    back = safe_get_card_field(card, 'back', '')
    category = safe_get_card_field(card, 'tags', '')
    audio_file = safe_get_card_field(card, 'audio', '')
    
    # Clean and convert content
    front_html = clean_field_content(simple_markdown_to_html(front), is_html=True)
    back_html = clean_field_content(simple_markdown_to_html(back), is_html=True)
    
    # Process audio references to ensure they work in Anki
    if not audio_file and '[sound:' not in front_html and '[audio:' not in front_html:
        # If no audio file is specified, look for references in the front content
        audio_matches = re.findall(r'\b(audio|sound):\s*([^\s\]]+)', front)
        if audio_matches:
            audio_file = audio_matches[0][1]
            logger.info(f"Extracted audio reference from content: {audio_file}")
    
    # Add explicit audio reference if provided but not already in the content
    if audio_file and '[sound:' not in front_html and '[audio:' not in front_html:
        front_html += f"<div class='audio-reference'>[sound:{audio_file}]</div>"
    
    # Ensure all audio references use the correct format
    front_html = process_audio_references(front_html)
    
    # Sanitize tags
    safe_tags = sanitize_tags(tags)
    
    try:
        return genanki.Note(
            model=model,
            fields=[category, front_html, back_html, ""],
            tags=safe_tags
        )
    except Exception as e:
        logger.error(f"Error creating audio note: {str(e)}")
        # Try a fallback approach with minimal content
        try:
            simple_front = f"<p>{front}</p>"
            if audio_file:
                simple_front += f"<p>[sound:{audio_file}]</p>"
            
            return genanki.Note(
                model=model,
                fields=["", simple_front, back, ""],
                tags=[]
            )
        except:
            logger.error("Failed to create audio note even with fallback approach")
            return None


# Helper functions

def convert_cloze_format(text):
    """Convert {{text}} to {{c1::text}} format for Anki cloze cards."""
    import re
    
    # Don't convert text that's already in c#:: format
    if re.search(r'\{\{c\d+::.*?\}\}', text):
        return text
        
    cloze_count = 1
    
    def replace_match(match):
        nonlocal cloze_count
        cloze_text = match.group(1)
        result = f'{{{{c{cloze_count}::{cloze_text}}}}}'
        cloze_count += 1
        return result
    
    # Process code blocks separately
    lines = text.split('\n')
    result_lines = []
    in_code_block = False
    code_block_lines = []
    
    for line in lines:
        if line.strip().startswith('```'):
            if not in_code_block:
                # Start of code block
                in_code_block = True
                result_lines.append(line)
                code_block_lines = []
            else:
                # End of code block
                in_code_block = False
                
                # Process the code block for cloze deletions
                processed_lines = []
                for code_line in code_block_lines:
                    if '{{' in code_line and '}}' in code_line:
                        processed_lines.append(re.sub(r'\{\{(.*?)\}\}', replace_match, code_line))
                    else:
                        processed_lines.append(code_line)
                
                # Add processed code block content
                result_lines.extend(processed_lines)
                result_lines.append(line)  # Add closing code block marker
        elif in_code_block:
            # Collect code block content
            code_block_lines.append(line)
        else:
            # Process regular text line
            if '{{' in line and '}}' in line:
                result_lines.append(re.sub(r'\{\{(.*?)\}\}', replace_match, line))
            else:
                result_lines.append(line)
    
    return '\n'.join(result_lines)

def process_audio_references(html):
    """Process audio references in HTML to ensure they work in Anki."""
    import re
    
    # Look for [audio:filename.mp3] or [sound:filename.mp3]
    pattern = r'\[(audio|sound):(.*?)\]'
    return re.sub(pattern, r'[sound:\2]', html)

def protect_latex_in_cloze(text):
    """Protect LaTeX expressions within cloze deletions."""
    import re
    
    # First check for LaTeX with embedded cloze
    # This pattern matches LaTeX formula with c1:: style notation inside
    latex_cloze_pattern = r'\$\$(.*?c\d+::.*?)\$\$|\$(.*?c\d+::.*?)\$'
    if re.search(latex_cloze_pattern, text, re.DOTALL):
        # Just return as is - we'll handle this specially elsewhere
        print("Found direct LaTeX with cloze marker - preserving intact")
        return text
    
    def process_cloze_latex(match):
        cloze_prefix = match.group(1)  # {{c1::
        cloze_content = match.group(2)  # content
        cloze_suffix = match.group(3)  # }}
        
        # If there's LaTeX inside the cloze, leave it intact
        if '$' in cloze_content or '\\[' in cloze_content or '\\(' in cloze_content:
            # Replace LaTeX delimiters with placeholders in cloze content
            latex_safe_content = cloze_content
            
            # Inline LaTeX: $...$ -> \(...\)
            latex_safe_content = re.sub(r'\$([^$]+)\$', 
                                       r'\\(\1\\)', 
                                       latex_safe_content)
            
            # Make sure we correctly handle LaTeX expressions
            return f"{cloze_prefix}{latex_safe_content}{cloze_suffix}"
            
        return match.group(0)  # Return unchanged
    
    # Pattern to match cloze deletions
    pattern = r'(\{\{c\d+::)(.*?)(\}\})'
    return re.sub(pattern, process_cloze_latex, text, flags=re.DOTALL)
