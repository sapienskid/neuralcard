import genanki
import html
from util.direct_parser import simple_markdown_to_html
import re
def create_basic_note(card, model, tags):
    """Create a basic front/back note.
    
    This handler also handles math content, as Anki natively supports LaTeX/MathJax.
    """
    front = card.get('front', '')
    back = card.get('back', '')
    category = card.get('tags', '')
    
    front_html = simple_markdown_to_html(front)
    back_html = simple_markdown_to_html(back)
    
    return genanki.Note(
        model=model,
        fields=[category, front_html, back_html, ""],
        tags=tags
    )

def create_cloze_note(card, model, tags):
    """Create a cloze deletion note with consistent styling."""
    front = card.get('front', '')
    category = card.get('tags', '')
    
    # Process cloze content
    if '{{c' not in front:
        front = convert_cloze_format(front)
    
    # Convert to HTML with consistent styling
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
    correct_answer = card.get('correct_answer', '')
    category = card.get('tags', '')
    
    # Convert question to HTML
    question_html = simple_markdown_to_html(question)
    
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
        for (var i = 0;  options.length >i; i++) {
            options[i].onclick = null;
            if (options[i] !== element) {
                options[i].style.opacity = '0.6';
            }
        }
    }
    </script>
    """
    
    # Create HTML for options (front)
    options_html = """
    <div class='mcq-section'>
        <div class='mcq-question'>%s</div>
        <div class='multiple-choice' id='mcq-options'>""" % question_html
    
    # Include direct onclick handlers (most reliable in Anki)
    for i, option in enumerate(options):
        option_html = simple_markdown_to_html(option)
        is_correct = option.strip() == correct_answer.strip()
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
        option_html = simple_markdown_to_html(option)
        is_correct = option.strip() == correct_answer.strip()
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
        tags=tags
    )

def create_true_false_note(card, model, tags):
    """Create a true/false question note with properly escaped HTML."""
    front = card.get('front', '')
    back = card.get('back', '')
    correct_answer = card.get('correct_answer', 'True')
    category = card.get('tags', '')
    
    # Convert markdown to HTML first
    front_html = simple_markdown_to_html(front)
    back_html = simple_markdown_to_html(back)
    
    # Instead of using HTML buttons directly, use div elements that will be styled as buttons
    # This avoids the HTML attribute escaping issues
    is_true_correct = str(correct_answer == "True").lower()
    is_false_correct = str(correct_answer == "False").lower()
    
    front_html += f"""
    <div class="true-false-container">
      <div class="tf-button" id="true-btn" data-correct="{is_true_correct}">True</div>
      <div class="tf-button" id="false-btn" data-correct="{is_false_correct}">False</div>
    </div>
    """
    
    back_html += f"<p><strong>Correct answer:</strong> {html.escape(correct_answer)}</p>"
    
    # Add script for checking true/false answers
    # Using a script tag that will be included in the card template
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
        tags=tags
    )

def create_reversed_note(card, model, tags):
    """Create a reversed note where front/back are swapped."""
    front = card.get('front', '')
    back = card.get('back', '')
    category = card.get('tags', '')
    
    front_html = simple_markdown_to_html(front)
    back_html = simple_markdown_to_html(back)
    
    # Create the reversed note (back content appears on front)
    return genanki.Note(
        model=model,
        fields=[category, back_html, front_html, ""],
        tags=tags
    )

def create_image_occlusion_note(card, model, tags):
    """Create an image occlusion note."""
    front = card.get('front', '')
    back = card.get('back', '')
    category = card.get('tags', '')
    masked_areas = card.get('masked_areas', [])
    
    front_html = simple_markdown_to_html(front)
    
    # Add masking divs for occluded areas
    if (masked_areas):
        front_html += "<div class='image-occlusion-container' style='position: relative;'>"
        for area in masked_areas:
            coords = area.split(',')
            if len(coords) >= 4:
                left, top, width, height = coords[:4]
                front_html += f"<div class='occlusion-rect' style='position: absolute; left: {left}px; top: {top}px; width: {width}px; height: {height}px; background-color: black;'></div>"
        front_html += "</div>"
    
    back_html = simple_markdown_to_html(back)
    
    return genanki.Note(
        model=model,
        fields=[category, front_html, back_html, ""],
        tags=tags
    )

def create_audio_note(card, model, tags):
    """Create a note with audio embedded."""
    front = card.get('front', '')
    back = card.get('back', '')
    category = card.get('tags', '')
    
    # Process audio references to ensure they work in Anki
    front_html = process_audio_references(simple_markdown_to_html(front))
    back_html = simple_markdown_to_html(back)
    
    return genanki.Note(
        model=model,
        fields=[category, front_html, back_html, ""],
        tags=tags
    )


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
