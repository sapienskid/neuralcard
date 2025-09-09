import re
import html

def simple_markdown_to_html(text: str) -> str:
    """Convert Markdown to HTML with special handling for code blocks and LaTeX."""
    if not text:
        return ""
    
    def process_latex(text):
        """Convert LaTeX delimiters to Anki-compatible format."""
        # Handle display math first ($$...$$)
        text = re.sub(r'\$\$(.*?)\$\$', r'\\[\1\\]', text, flags=re.DOTALL)
        
        # Handle inline math ($...$) but avoid double-dollar cases
        def replace_inline_math(match):
            # Check if it's not part of a double-dollar
            if not (match.string[match.start()-1:match.start()] == '$' or 
                   match.string[match.end():match.end()+1] == '$'):
                return f'\\({match.group(1)}\\)'
            return match.group(0)
        
        text = re.sub(r'(?<!\$)\$([^$]+?)\$(?!\$)', replace_inline_math, text)
        
        # Convert [latex]...[/latex] to appropriate format
        text = re.sub(r'\[latex\](.*?)\[/latex\]', r'\\[\1\\]', text, flags=re.DOTALL)
        
        # Convert [$]...[/$] to inline format
        text = re.sub(r'\[\$\](.*?)\[/\$\]', r'\\(\1\\)', text, flags=re.DOTALL)
        
        # Convert [$$]...[/$$] to display format
        text = re.sub(r'\[\$\$\](.*?)\[/\$\$\]', r'\\[\1\\]', text, flags=re.DOTALL)
        
        return text
    
    # Process LaTeX before other markdown
    text = process_latex(text)
    
    # Protect code blocks
    code_blocks = []
    def save_code(match):
        code_blocks.append(match.group(1))
        return f"CODEBLOCK{len(code_blocks)-1}"
    text = re.sub(r'```(.*?)```', save_code, text, flags=re.DOTALL)
    
    # Escape HTML except for LaTeX delimiters
    text = re.sub(r'[&<>"]', lambda m: html.escape(m.group(0)), text)
    
    # Convert Markdown
    text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)  # Bold
    text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', text)  # Italic
    text = re.sub(r'`(.*?)`', r'<code>\1</code>', text)  # Inline code
    text = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2">\1</a>', text)  # Links
    text = re.sub(r'!\[(.*?)\]\((.*?)\)', r'<img src="\2" alt="\1">', text)  # Images
    
    # Process lists
    text = re.sub(r'^\s*[-*]\s*(.*?)$', r'<li>\1</li>', text, flags=re.MULTILINE)
    text = re.sub(r'(<li>.*?</li>)', r'<ul>\1</ul>', text, flags=re.DOTALL)
    
    # Restore code blocks with syntax highlighting
    for i, block in enumerate(code_blocks):
        lang = ''
        if block.split('\n', 1)[0].strip():
            lang = block.split('\n', 1)[0].strip()
            block = block.split('\n', 1)[1] if '\n' in block else ''
        text = text.replace(
            f"CODEBLOCK{i}",
            f'<pre><code class="language-{lang}">{html.escape(block)}</code></pre>'
        )
    
    # Convert paragraphs (double newlines)
    paragraphs = text.split('\n\n')
    text = '\n'.join(f'<p>{p.strip()}</p>' for p in paragraphs if p.strip())
    
    return text

def create_card_html_container(content: str, card_type: str = "", tags: list = None) -> str:
    """Create a standardized HTML container for card content."""
    tags_html = ""
    if tags:
        tag_spans = [f'<span class="tag">{tag}</span>' for tag in tags]
        tags_html = f'<div class="tags-container">{" ".join(tag_spans)}</div>'
    
    return f"""
    <div class="card-container {card_type}">
        <div class="card-content">
            {content}
        </div>
        {tags_html}
    </div>
    """

def create_interactive_script(script_type: str, **kwargs) -> str:
    """Create standardized interactive scripts for different card types."""
    scripts = {
        'mcq': """
        <script>
        function checkMCQAnswer(element, isCorrect) {
            element.style.backgroundColor = isCorrect ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)';
            element.style.borderColor = isCorrect ? '#2ecc71' : '#e74c3c';
            
            var icon = element.querySelector('.mcq-result-icon');
            icon.textContent = isCorrect ? '✓' : '✗';
            icon.style.color = isCorrect ? '#2ecc71' : '#e74c3c';
            
            var options = document.querySelectorAll('.mcq-option');
            for (var i = 0; options.length > i; i++) {
                options[i].onclick = null;
                if (options[i] !== element) {
                    options[i].style.opacity = '0.6';
                }
            }
        }
        </script>
        """,
        'true_false': """
        <script>
        function checkTrueFalseAnswer(selection) {
            var buttons = document.querySelectorAll('.tf-button');
            buttons.forEach(function(btn) {
                btn.style.pointerEvents = 'none';
                
                if (btn.getAttribute('data-correct') === 'true') {
                    btn.style.backgroundColor = '#4CAF50';
                    btn.style.color = 'white';
                } else if (btn.id === selection + '-btn' && btn.getAttribute('data-correct') === 'false') {
                    btn.style.backgroundColor = '#f44336';
                    btn.style.color = 'white';
                }
            });
        }
        
        document.addEventListener("DOMContentLoaded", function() {
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
        </script>
        """
    }
    
    return scripts.get(script_type, "")
