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
