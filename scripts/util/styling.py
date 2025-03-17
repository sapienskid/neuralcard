def get_card_styles(style_name="default"):
    """Return unified CSS styles for all card types based on the selected style.
    
    Args:
        style_name (str): The name of the style to use (default, retro, minimal, dark, colorful)
    
    Returns:
        str: CSS styles for cards
    """
    styles = {
        "default": get_default_style(),
        "retro": get_retro_style(),
        "minimal": get_minimal_style(),
        "bauhaus": get_bauhaus_style(),
        "colorful": get_colorful_style(),
        "brutalist": get_brutalist_style(),
        "contemporary": get_contemporary_style()
    }
    
    return styles.get(style_name, styles["default"])

def get_default_style():
    """Return the default card style."""
    return """/* Default style - Modern and clean */
    .card {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        padding: 1rem;
        background-color: #f5f6f7;
    }

    .content {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        transition: all 0.3s ease;
    }

    /* Light/Dark mode */
    @media (prefers-color-scheme: light) {
        .card { background-color: #f5f6f7; }
        .content {
            background-color: #ffffff;
            color: #2c3e50;
            border: 1px solid #eef2f7;
        }
        .category { color: #7f8c9c; }
        pre, code { background-color: #f8f9fb; }
    }

    @media (prefers-color-scheme: dark) {
        .card { background-color: #1e2227; }
        .content {
            background-color: #2d333b;
            color: #e6edf3;
            border: 1px solid #444c56;
        }
        .category { color: #768390; }
        pre, code { background-color: #22272e; }
    }

    /* Category */
    .category {
        font-size: 0.85em;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 1.5rem;
					padding-bottom: 0.5rem;
        border-bottom: 2px solid #3498db;
    }

    /* MCQ specific styling */
    .mcq-section {
        display: flex;
        flex-direction: column;
        align-items: center;  /* Center horizontally */
        width: 100%;
        max-width: 600px;
        margin: 20px auto;  /* Changed from '20px 0' to '20px auto' for centering */
        padding: 0 1rem;
    }

    .mcq-question {
        font-size: 1.1em;
        margin-bottom: 20px;
        padding: 1.2rem;
        border-radius: 8px;
        background: rgba(52, 152, 219, 0.05);
        width: 100%;
        box-sizing: border-box;
    }

    .multiple-choice {
        display: flex;
        flex-direction: column;
        align-items: center;  /* Center horizontally */
        gap: 12px;
        width: 100%;
    }

    .mcq-option {
        width: 100%;
        margin: 0.8rem 0;
        padding: 1rem 1.2rem;
        border: 2px solid #3498db;
        border-radius: 8px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        transition: all 0.3s ease;
        box-sizing: border-box;
        word-break: break-word;
        overflow-wrap: break-word;
    }

    .mcq-option:hover:not(.disabled):not(.clicked) {
        background: rgba(52, 152, 219, 0.1);
        transform: translateX(4px);
    }

    .mcq-option.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .mcq-option.clicked {
        pointer-events: none;
    }

    /* MCQ option content layout */
    .mcq-option-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        gap: 12px;
        min-height: 24px;
    }

    .mcq-option-text {
        flex: 1;
        padding-right: 0.5rem;
        line-height: 1.4;
        display: flex;
        align-items: center;
    }

    .mcq-result-icon {
        font-size: 1.2em;
        font-weight: bold;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        height: 24px;
        margin-top: 2px;
    }

    /* Responsive design for smaller screens */
    @media screen and (max-width: 480px) {
        .mcq-section {
            padding: 0 0.5rem;
        }

        .mcq-question,
        .mcq-option {
            padding: 1rem;
        }

        .mcq-option-content {
            gap: 0.5rem;
        }
    }

    /* True/False styles */
    .true-false-container {
        display: flex;
        gap: 1rem;
        margin: 1.5rem 0;
    }

    .tf-button {
        flex: 1;
        padding: 1rem;
        border: 2px solid #3498db;
        border-radius: 8px;
        background: transparent;
        color: inherit;
        font-weight: 500;
        text-align: center;
        transition: all 0.2s ease;
        cursor: pointer;
    }

    /* Generic elements */
    hr {
        margin: 2rem 0;
    }

    /* Remove legacy styles */
    .mcq-feedback-area,
    .multiple-choice button::after,
    .multiple-choice button.correct::after,
    .multiple-choice button.incorrect::after {
        display: none;
    }
    
    """

def get_retro_style():
    """Return a retro-inspired card style."""
    return """/* Retro style - 80s/90s inspired - Enhanced for readability */
    .card {
        font-family: 'VT323', 'Courier New', monospace;
        line-height: 1.6;
        padding: 1.5rem;
        background-color: #fdfd96;
        background-image: linear-gradient(45deg, #fdfd96 25%, #ffb347 25%, #ffb347 50%, #fdfd96 50%, #fdfd96 75%, #ffb347 75%, #ffb347 100%);
        background-size: 56.57px 56.57px;
    }

    .content {
        max-width: 800px;
        margin: 0 auto;
        padding: 2.5rem;
        border-radius: 0px;
        border: 4px solid #000;
        box-shadow: 12px 12px 0px #ff6b6b;
        transition: all 0.3s ease;
        position: relative;
    }

    /* Light/Dark mode with improved contrast */
    @media (prefers-color-scheme: light) {
        .card { background-color: #fdfd96; }
        .content {
            background-color: #ffffff;
            color: #222222;
            border: 4px solid #000;
        }
        .category { color: #e84545; }
        
        /* Enhanced code blocks */
        pre, code { 
            font-family: 'IBM Plex Mono', 'Courier New', monospace;
            background-color: #f0f0f0; 
            border-left: 4px solid #ff6b6b;
            padding: 1.2rem;
            margin: 1.5rem 0;
            border-radius: 0;
            font-size: 0.95em;
            line-height: 1.5;
            overflow-x: auto;
            color: #333;
            box-shadow: 4px 4px 0px #ff6b6b;
        }
        
        code {
            padding: 0.2rem 0.4rem;
            border-left: none;
            box-shadow: none;
        }
        
        /* Syntax highlighting */
        .token.comment { color: #6a737d; }
        .token.keyword { color: #d73a49; font-weight: bold; }
        .token.string { color: #032f62; }
        .token.number { color: #005cc5; }
        .token.function { color: #6f42c1; }
    }

    @media (prefers-color-scheme: dark) {
        .card { 
            background-color: #222222;
            background-image: linear-gradient(45deg, #222222 25%, #444444 25%, #444444 50%, #222222 50%, #222222 75%, #444444 75%, #444444 100%);
        }
        .content {
            background-color: #111111;
            color: #ff9ff3;
            border: 4px solid #ff9ff3;
            box-shadow: 12px 12px 0px #00d2d3;
        }
        .category { color: #00d2d3; }
        
        /* Enhanced code blocks for dark mode */
        pre, code { 
            font-family: 'IBM Plex Mono', 'Courier New', monospace;
            background-color: #2a2a2a; 
            border-left: 4px solid #00d2d3;
            padding: 1.2rem;
            margin: 1.5rem 0;
            border-radius: 0;
            font-size: 0.95em;
            line-height: 1.5;
            overflow-x: auto;
            color: #e6e6e6;
            box-shadow: 4px 4px 0px #00d2d3;
        }
        
        code {
            padding: 0.2rem 0.4rem;
            border-left: none;
            box-shadow: none;
        }
        
        /* Syntax highlighting for dark mode */
        .token.comment { color: #8b949e; }
        .token.keyword { color: #ff7b72; font-weight: bold; }
        .token.string { color: #a5d6ff; }
        .token.number { color: #79c0ff; }
        .token.function { color: #d2a8ff; }
    }

    /* Category with improved styling */
    .category {
        font-size: 1.1em;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.15em;
        margin-bottom: 1.8rem;
        padding-bottom: 0.6rem;
        border-bottom: 4px solid #ff6b6b;
        display: inline-block;
        position: relative;
    }

    .category::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 0;
        width: 100%;
        height: 2px;
        background-color: #ff6b6b;
    }

    /* MCQ specific styling with improved readability */
    .mcq-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        max-width: 600px;
        margin: 25px auto;
        padding: 0 1rem;
    }

    .mcq-question {
        font-size: 1.2em;
        margin-bottom: 25px;
        padding: 1.4rem;
        border: 3px solid #000;
        background: #ffeaa7;
        color: #000;
        width: 100%;
        box-sizing: border-box;
        box-shadow: 5px 5px 0px #000;
    }

    .multiple-choice {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        width: 100%;
    }

    .mcq-option {
        width: 100%;
        margin: 0.9rem 0;
        padding: 1.2rem 1.4rem;
        border: 3px solid #000;
        background: #ffffff;
        color: #000;
        cursor: pointer;
        transition: all 0.2s ease;
        box-sizing: border-box;
        word-break: break-word;
        overflow-wrap: break-word;
        font-weight: bold;
        transform: rotate(-1deg);
        box-shadow: 4px 4px 0px #000;
    }

    .mcq-option:nth-child(odd) {
        transform: rotate(1deg);
    }

    .mcq-option:hover:not(.disabled):not(.clicked) {
        background: #fdcb6e;
        transform: translateX(4px) rotate(-1deg);
        box-shadow: 6px 6px 0px #000;
    }

    .mcq-option:nth-child(odd):hover:not(.disabled):not(.clicked) {
        transform: translateX(4px) rotate(1deg);
        box-shadow: 6px 6px 0px #000;
    }

    .mcq-option.disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .mcq-option.clicked {
        pointer-events: none;
    }

    /* MCQ option content layout */
    .mcq-option-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        gap: 14px;
        min-height: 28px;
    }

    .mcq-option-text {
        flex: 1;
        padding-right: 0.6rem;
        line-height: 1.5;
        display: flex;
        align-items: center;
    }

    .mcq-result-icon {
        font-size: 1.3em;
        font-weight: bold;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 28px;
        height: 28px;
        margin-top: 2px;
    }

    /* True/False styles with improved interaction */
    .true-false-container {
        display: flex;
        gap: 1.2rem;
        margin: 1.8rem 0;
    }

    .tf-button {
        flex: 1;
        padding: 1.2rem;
        border: 3px solid #000;
        background: #ffffff;
        color: #000;
        font-weight: bold;
        text-align: center;
        transition: all 0.25s ease;
        cursor: pointer;
        box-shadow: 4px 4px 0px #000;
    }

    .tf-button:first-child {
        transform: rotate(-2deg);
    }

    .tf-button:last-child {
        transform: rotate(2deg);
    }

    .tf-button:hover {
        background: #fdcb6e;
        transform: translateY(-4px) rotate(0deg);
        box-shadow: 6px 6px 0px #000;
    }

    /* Generic elements */
    hr {
        margin: 2.5rem 0;
        border: 3px dashed #ff6b6b;
        background-color: transparent;
        height: 0;
    }

    /* Typography improvements */
    h1, h2, h3, h4, h5, h6 {
        font-family: 'Press Start 2P', 'VT323', cursive;
        margin-top: 2rem;
        margin-bottom: 1rem;
        line-height: 1.4;
    }

    h1 {
        font-size: 2rem;
        text-shadow: 2px 2px 0px #ff6b6b;
    }

    h2 {
        font-size: 1.6rem;
        border-bottom: 3px solid;
        padding-bottom: 0.4rem;
    }

    /* Link styling */
    a {
        color: #e84545;
        text-decoration: none;
        font-weight: bold;
        padding: 0 2px;
        border-bottom: 2px solid #e84545;
        transition: all 0.2s ease;
    }

    a:hover {
        background-color: #e84545;
        color: white;
    }

    /* Dark mode link styling */
    @media (prefers-color-scheme: dark) {
        a {
            color: #00d2d3;
            border-bottom: 2px solid #00d2d3;
        }
        
        a:hover {
            background-color: #00d2d3;
            color: #111111;
        }
        
        h1 {
            text-shadow: 2px 2px 0px #00d2d3;
        }
    }

    /* Add a retro grid background effect */
    .content::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image: 
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
        background-size: 20px 20px;
        pointer-events: none;
        z-index: -1;
    }

    /* Add some pixel art decorations */
    .content::after {
        content: '';
        position: absolute;
        bottom: 15px;
        right: 15px;
        width: 30px;
        height: 30px;
        background-color: transparent;
        box-shadow: 
            0px 0px 0 3px #ff6b6b,
            3px 3px 0 3px #ff6b6b,
            6px 6px 0 3px #ff6b6b,
            9px 9px 0 3px #ff6b6b;
        transform: rotate(45deg);
        opacity: 0.6;
    }

    @media (prefers-color-scheme: dark) {
        .content::after {
            box-shadow: 
                0px 0px 0 3px #00d2d3,
                3px 3px 0 3px #00d2d3,
                6px 6px 0 3px #00d2d3,
                9px 9px 0 3px #00d2d3;
        }
    }

    /* Remove legacy styles */
    .mcq-feedback-area,
    .multiple-choice button::after,
    .multiple-choice button.correct::after,
    .multiple-choice button.incorrect::after {
        display: none;
    }
    """

def get_bauhaus_style():
    """Return a Bauhaus-inspired card style."""
    return """/* Bauhaus style - Primary colors, geometric shapes, functional */
    .card {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        padding: 1.5rem;
        background-color: #f0f0f0;
    }

    .content {
        max-width: 800px;
        margin: 0 auto;
        padding: 2.5rem;
        border-radius: 0;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        border-left: 20px solid #d7191c;
        transition: all 0.3s ease;
        position: relative;
    }

    .content:before {
        content: "";
        position: absolute;
        top: 0;
        right: 0;
        width: 80px;
        height: 80px;
        background-color: #fdae61;
        z-index: -1;
    }

    .content:after {
        content: "";
        position: absolute;
        bottom: 0;
        right: 80px;
        width: 40px;
        height: 40px;
        background-color: #2c7bb6;
        z-index: -1;
    }

    /* Light/Dark mode */
    @media (prefers-color-scheme: light) {
        .card { background-color: #f5f5f5; }
        .content {
            background-color: #ffffff;
            color: #212121;
            border-left: 20px solid #d7191c;
        }
        .category { color: #212121; }
        pre, code { 
            background-color: #f5f5f5; 
            border-left: 4px solid #d7191c;
        }
    }

    @media (prefers-color-scheme: dark) {
        .card { background-color: #121212; }
        .content {
            background-color: #1e1e1e;
            color: #f0f0f0;
            border-left: 20px solid #d7191c;
        }
        .content:before {
            background-color: #fdae61;
        }
        .content:after {
            background-color: #2c7bb6;
        }
        .category { color: #f0f0f0; }
        pre, code { 
            background-color: #121212; 
            border-left: 4px solid #d7191c;
        }
    }

    /* Category */
    .category {
        font-size: 0.95em;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.25em;
        margin-bottom: 1.8rem;
        padding-bottom: 0.8rem;
        border-bottom: 4px solid #000000;
    }

    /* MCQ specific styling */
    .mcq-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        max-width: 650px;
        margin: 25px auto;
        padding: 0 1.2rem;
    }

    .mcq-question {
        font-size: 1.2em;
        line-height: 1.5;
        margin-bottom: 25px;
        padding: 1.4rem;
        background: #f5f5f5;
        color: #212121;
        width: 100%;
        box-sizing: border-box;
        border-left: 10px solid #2c7bb6;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .multiple-choice {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        width: 100%;
    }

    .mcq-option {
        width: 100%;
        margin: 0.9rem 0;
        padding: 1.2rem 1.4rem;
        border: none;
        background: #f5f5f5;
        color: #212121;
        cursor: pointer;
        transition: all 0.25s ease;
        box-sizing: border-box;
        word-break: break-word;
        overflow-wrap: break-word;
        border-left: 10px solid transparent;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    }

    .mcq-option:hover:not(.disabled):not(.clicked) {
        border-left: 10px solid #fdae61;
        background: #ffffff;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
        transform: translateY(-2px);
    }

    .mcq-option.disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .mcq-option.clicked {
        pointer-events: none;
    }

    /* MCQ option content layout */
    .mcq-option-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        gap: 15px;
        min-height: 28px;
    }

    .mcq-option-text {
        flex: 1;
        padding-right: 0.6rem;
        line-height: 1.5;
        display: flex;
        align-items: center;
        font-size: 1.05em;
    }

    .mcq-result-icon {
        font-size: 1.25em;
        font-weight: bold;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 28px;
        height: 28px;
        margin-top: 2px;
        color: #d7191c;
    }

    /* True/False styles */
    .true-false-container {
        display: flex;
        gap: 1.2rem;
        margin: 1.8rem 0;
    }

    .tf-button {
        flex: 1;
        padding: 1.2rem;
        border: none;
        background: #f5f5f5;
        color: #212121;
        font-weight: bold;
        text-align: center;
        transition: all 0.25s ease;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    }

    .tf-button:first-child {
        border-left: 10px solid #d7191c;
    }

    .tf-button:last-child {
        border-left: 10px solid #2c7bb6;
    }

    .tf-button:hover {
        background: #ffffff;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
        transform: translateY(-2px);
    }

    /* Generic elements */
    hr {
        margin: 2.5rem 0;
        border: none;
        height: 4px;
        background-color: #000000;
    }

    /* Remove legacy styles */
    .mcq-feedback-area,
    .multiple-choice button::after,
    .multiple-choice button.correct::after,
    .multiple-choice button.incorrect::after {
        display: none;
    }
    """
def get_minimal_style():
    """Return a minimalist card style."""
    return """/* Minimal style - Clean, simple, uncluttered */
    .card {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        line-height: 1.7;
        padding: 1.5rem;
        background-color: #ffffff;
    }

    .content {
        max-width: 800px;
        margin: 0 auto;
        padding: 2.5rem;
        border-radius: 0;
        box-shadow: none;
        border: none;
        transition: all 0.3s ease;
    }

    /* Light/Dark mode */
    @media (prefers-color-scheme: light) {
        .card { background-color: #ffffff; }
        .content {
            background-color: #ffffff;
            color: #222222;
        }
        .category { color: #666666; }
        pre, code { 
            background-color: #f9f9f9; 
            border-left: 2px solid #eeeeee;
            padding: 0.8rem;
        }
    }

    @media (prefers-color-scheme: dark) {
        .card { background-color: #121212; }
        .content {
            background-color: #121212;
            color: #f0f0f0;
        }
        .category { color: #a8a8a8; }
        pre, code { 
            background-color: #1e1e1e; 
            border-left: 2px solid #333333;
            padding: 0.8rem;
        }
    }

    /* Category */
    .category {
        font-size: 0.85em;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        margin-bottom: 1.8rem;
        padding-bottom: 0.7rem;
        border-bottom: 1px solid #e0e0e0;
    }

    /* MCQ specific styling */
    .mcq-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        max-width: 650px;
        margin: 25px auto;
        padding: 0;
    }

    .mcq-question {
        font-size: 1.1em;
        margin-bottom: 25px;
        padding: 1.2rem 0;
        width: 100%;
        box-sizing: border-box;
        border-bottom: 1px solid #e0e0e0;
        font-weight: 500;
    }

    .multiple-choice {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        width: 100%;
    }

    .mcq-option {
        width: 100%;
        margin: 0.6rem 0;
        padding: 1.2rem 0.8rem;
        border: none;
        border-bottom: 1px solid #e0e0e0;
        background: transparent;
        color: inherit;
        cursor: pointer;
        transition: all 0.25s ease;
        box-sizing: border-box;
        word-break: break-word;
        overflow-wrap: break-word;
        text-align: left;
        border-radius: 2px;
    }

    .mcq-option:hover:not(.disabled):not(.clicked) {
        background: rgba(0, 0, 0, 0.03);
        transform: translateX(2px);
    }

    .mcq-option.disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .mcq-option.clicked {
        pointer-events: none;
    }

    /* MCQ option content layout */
    .mcq-option-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        gap: 15px;
        min-height: 26px;
    }

    .mcq-option-text {
        flex: 1;
        padding-right: 0.6rem;
        line-height: 1.5;
        display: flex;
        align-items: center;
        font-size: 1.05em;
    }

    .mcq-result-icon {
        font-size: 1.05em;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 22px;
        margin-top: 2px;
    }

    /* True/False styles */
    .true-false-container {
        display: flex;
        gap: 1.2rem;
        margin: 1.8rem 0;
    }

    .tf-button {
        flex: 1;
        padding: 1rem;
        border: 1px solid #e0e0e0;
        border-radius: 2px;
        background: transparent;
        color: inherit;
        font-weight: 500;
        text-align: center;
        transition: all 0.25s ease;
        cursor: pointer;
    }

    .tf-button:hover {
        background: rgba(0, 0, 0, 0.03);
        transform: translateY(-1px);
    }

    /* Generic elements */
    hr {
        margin: 2.5rem 0;
        border: none;
        height: 1px;
        background-color: #e0e0e0;
    }

    /* Remove legacy styles */
    .mcq-feedback-area,
    .multiple-choice button::after,
    .multiple-choice button.correct::after,
    .multiple-choice button.incorrect::after {
        display: none;
    }
    """
def get_colorful_style():
    """Return a colorful, vibrant card style."""
    return """/* Colorful style - Vibrant, playful, solid colors */
    .card {
        font-family: 'Nunito', 'Segoe UI', sans-serif;
        line-height: 1.6;
        padding: 1rem;
        background-color: #b8e0ff;
    }

    .content {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        border: none;
        background-color: #fff8e8;
    }

    /* Light/Dark mode */
    @media (prefers-color-scheme: light) {
        .card { 
            background-color: #b8e0ff;
        }
        .content {
            background-color: #fff8e8;
            color: #333333;
            border: 3px solid #ffb8e0;
        }
        .category { 
            color: #ffffff;
            background-color: #ff7eb9;
        }
        pre, code { 
            background-color: #e2f5ff; 
            border: 2px solid #7bafff;
        }
    }

    @media (prefers-color-scheme: dark) {
        .card { 
            background-color: #2a2a4a;
        }
        .content {
            background-color: #363670;
            color: #f0f0f0;
            border: 3px solid #7977ff;
        }
        .category { 
            color: #ffffff;
            background-color: #7977ff;
        }
        pre, code { 
            background-color: #2a2a3a; 
            border: 2px solid #7977ff;
        }
    }

    /* Category */
    .category {
        font-size: 1em;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 1.5rem;
        padding: 0.5rem 1rem;
        border-radius: 8px;
    }

    /* MCQ specific styling */
    .mcq-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        max-width: 600px;
        margin: 20px auto;
        padding: 0 1rem;
    }

    .mcq-question {
        font-size: 1.1em;
        margin-bottom: 20px;
        padding: 1.2rem;
        border-radius: 12px;
        background-color: #ffd6e0;
        width: 100%;
        box-sizing: border-box;
        border-left: 8px solid #ff7eb9;
    }

    .multiple-choice {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        width: 100%;
    }

    .mcq-option {
        width: 100%;
        margin: 0.8rem 0;
        padding: 1rem 1.2rem;
        border: none;
        border-radius: 12px;
        background-color: #e2f5ff;
        color: inherit;
        cursor: pointer;
        transition: all 0.3s ease;
        box-sizing: border-box;
        word-break: break-word;
        overflow-wrap: break-word;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        border-left: 5px solid #7bafff;
    }

    .mcq-option:nth-child(2n) {
        background-color: #e0ffe8;
        border-left: 5px solid #7bffb8;
    }

    .mcq-option:nth-child(3n) {
        background-color: #fff0d6;
        border-left: 5px solid #ffb977;
    }

    .mcq-option:nth-child(4n) {
        background-color: #ffe0f0;
        border-left: 5px solid #ff7eb9;
    }

    .mcq-option:hover:not(.disabled):not(.clicked) {
        background-color: #d1fffc;
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        border-left: 5px solid #77f0ea;
    }

    .mcq-option.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .mcq-option.clicked {
        pointer-events: none;
    }

    /* MCQ option content layout */
    .mcq-option-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        gap: 12px;
        min-height: 24px;
    }

    .mcq-option-text {
        flex: 1;
        padding-right: 0.5rem;
        line-height: 1.4;
        display: flex;
        align-items: center;
    }

    .mcq-result-icon {
        font-size: 1.2em;
        font-weight: bold;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        height: 24px;
        margin-top: 2px;
        background-color: #ffeb3b;
        border-radius: 50%;
        color: #333;
    }

    /* True/False styles */
    .true-false-container {
        display: flex;
        gap: 1rem;
        margin: 1.5rem 0;
    }

    .tf-button {
        flex: 1;
        padding: 1rem;
        border: none;
        border-radius: 12px;
        color: inherit;
        font-weight: 600;
        text-align: center;
        transition: all 0.3s ease;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    }

    .tf-button.true {
        background-color: #c8ffbf;
        border-left: 5px solid #66de5a;
    }

    .tf-button.false {
        background-color: #ffc2c2;
        border-left: 5px solid #ff7575;
    }

    .tf-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    }

    .tf-button.true:hover {
        background-color: #a5ff94;
    }

    .tf-button.false:hover {
        background-color: #ffa5a5;
    }

    /* Code blocks */
    pre {
        padding: 1.25rem;
        margin: 1.5rem 0;
        overflow-x: auto;
        line-height: 1.45;
        border-radius: 8px;
    }

    code {
        padding: 0.2em 0.4em;
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        font-size: 0.9em;
        border-radius: 4px;
    }

    /* Generic elements */
    hr {
        margin: 2rem 0;
        border: none;
        height: 3px;
        background-color: #ff7eb9;
        border-radius: 3px;
    }

    /* Remove legacy styles */
    .mcq-feedback-area,
    .multiple-choice button::after,
    .multiple-choice button.correct::after,
    .multiple-choice button.incorrect::after {
        display: none;
    }
    """

def get_brutalist_style():
    """Return a brutalist card style."""
    return """/* Brutalist style - Raw, utilitarian, bold typography - Enhanced for readability */
    .card {
        font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
        line-height: 1.6;
        padding: 1.5rem;
        background-color: #f0f0f0;
        background-image: url("data:image/svg+xml,%3Csvg width='6' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 0h1L0 5v1H0V0h5z' fill='%23000000' fill-opacity='0.1'/%3E%3C/svg%3E");
    }

    .content {
        max-width: 800px;
        margin: 0 auto;
        padding: 2.5rem;
        border: 3px solid #000;
        border-radius: 0;
        box-shadow: 12px 12px 0 #000;
        background-color: #fff;
        position: relative;
    }

    /* Light/Dark mode with improved readability */
    @media (prefers-color-scheme: light) {
        .card { 
            background-color: #f0f0f0;
            background-image: url("data:image/svg+xml,%3Csvg width='6' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 0h1L0 5v1H0V0h5z' fill='%23000000' fill-opacity='0.1'/%3E%3C/svg%3E");
        }
        .content {
            background-color: #fff;
            color: #000;
            border: 3px solid #000;
            box-shadow: 12px 12px 0 #000;
        }
        .category { 
            color: #000; 
            background-color: #ff0;
        }
        
        /* Enhanced code blocks for light mode */
        pre, code { 
            font-family: 'Fira Code', 'JetBrains Mono', monospace;
            background-color: #f5f5f5; 
            border: 2px solid #000;
            border-radius: 0;
            padding: 1.2rem;
            margin: 1.5rem 0;
            font-size: 0.95em;
            line-height: 1.6;
            overflow-x: auto;
            color: #121212;
            box-shadow: 5px 5px 0 #000;
            position: relative;
        }
        
        code {
            padding: 0.2rem 0.4rem;
            margin: 0 0.2rem;
            box-shadow: none;
            border-width: 1px;
            font-weight: normal;
            text-decoration: none;
        }
        
        /* Syntax highlighting for light mode */
        .token.comment { color: #5c6370; font-style: italic; }
        .token.keyword { color: #c678dd; font-weight: bold; text-decoration: none; }
        .token.string { color: #98c379; text-decoration: none; }
        .token.number { color: #d19a66; text-decoration: none; }
        .token.function { color: #61afef; font-weight: bold; text-decoration: none; }
        .token.boolean { color: #d19a66; text-decoration: none; }
        .token.operator { color: #56b6c2; text-decoration: none; }
        .token.punctuation { color: #abb2bf; text-decoration: none; }
    }

    @media (prefers-color-scheme: dark) {
        .card { 
            background-color: #111;
            background-image: url("data:image/svg+xml,%3Csvg width='6' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 0h1L0 5v1H0V0h5z' fill='%23ffffff' fill-opacity='0.1'/%3E%3C/svg%3E");
        }
        .content {
            background-color: #222;
            color: #fff;
            border: 3px solid #fff;
            box-shadow: 12px 12px 0 #fff;
        }
        .category { 
            color: #000; 
            background-color: #ff0;
        }
        
        /* Enhanced code blocks for dark mode */
        pre, code { 
            font-family: 'Fira Code', 'JetBrains Mono', monospace;
            background-color: #2d2d2d; 
            border: 2px solid #fff;
            border-radius: 0;
            padding: 1.2rem;
            margin: 1.5rem 0;
            font-size: 0.95em;
            line-height: 1.6;
            overflow-x: auto;
            color: #f8f8f2;
            box-shadow: 5px 5px 0 #fff;
            position: relative;
            text-decoration: none;
        }
        
        code {
            padding: 0.2rem 0.4rem;
            margin: 0 0.2rem;
            box-shadow: none;
            border-width: 1px;
            font-weight: normal;
            text-decoration: none;
        }
        
        /* Syntax highlighting for dark mode */
        .token.comment { color: #6272a4; font-style: italic; text-decoration: none; }
        .token.keyword { color: #ff79c6; font-weight: bold; text-decoration: none; }
        .token.string { color: #f1fa8c; text-decoration: none; }
        .token.number { color: #bd93f9; text-decoration: none; }
        .token.function { color: #50fa7b; font-weight: bold; text-decoration: none; }
        .token.boolean { color: #bd93f9; text-decoration: none; }
        .token.operator { color: #ff79c6; text-decoration: none; }
        .token.punctuation { color: #f8f8f2; text-decoration: none; }
    }

    /* Category with improved styling */
    .category {
        font-size: 1.1em;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 1.8rem;
        padding: 0.6rem 1rem;
        display: inline-block;
        background-color: #ff0;
        color: #000;
        transform: rotate(-2deg);
        box-shadow: 4px 4px 0 #000;
        position: relative;
    }

    /* Add label to code blocks for better identification */
    pre::before {
        display: block;
        content: '';
        height: 0.8rem;
        width: 100%;
        background-color: #000;
        position: absolute;
        top: 0;
        left: 0;
        border-bottom: 2px solid;
    }

    /* MCQ specific styling with improved readability */
    .mcq-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        max-width: 600px;
        margin: 25px auto;
        padding: 0 1rem;
    }

    .mcq-question {
        font-size: 1.2em;
        margin-bottom: 25px;
        padding: 1.4rem;
        border: 3px solid #000;
        width: 100%;
        box-sizing: border-box;
        position: relative;
        background-color: #fff;
        color: #000;
        box-shadow: 8px 8px 0 #000;
    }

    .multiple-choice {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 18px;
        width: 100%;
    }

    .mcq-option {
        width: 100%;
        margin: 0.9rem 0;
        padding: 1.2rem 1.4rem;
        border: 3px solid #000;
        background: #fff;
        color: #000;
        cursor: pointer;
        transition: all 0.15s ease;
        box-sizing: border-box;
        word-break: break-word;
        overflow-wrap: break-word;
        font-weight: bold;
        text-transform: uppercase;
        position: relative;
        box-shadow: 5px 5px 0 #000;
    }

    .mcq-option:hover:not(.disabled):not(.clicked) {
        background: #000;
        color: #fff;
        transform: translate(5px, 5px);
        box-shadow: 0px 0px 0 #000;
    }

    .mcq-option.disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .mcq-option.clicked {
        pointer-events: none;
    }

    /* MCQ option content layout */
    .mcq-option-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        gap: 14px;
        min-height: 28px;
    }

    .mcq-option-text {
        flex: 1;
        padding-right: 0.6rem;
        line-height: 1.5;
        display: flex;
        align-items: center;
    }

    .mcq-result-icon {
        font-size: 1.3em;
        font-weight: bold;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 28px;
        height: 28px;
        margin-top: 2px;
    }

    /* True/False styles with improved interaction */
    .true-false-container {
        display: flex;
        gap: 1.2rem;
        margin: 1.8rem 0;
    }

    .tf-button {
        flex: 1;
        padding: 1.2rem;
        border: 3px solid #000;
        background: #fff;
        color: #000;
        font-weight: bold;
        text-transform: uppercase;
        text-align: center;
        transition: all 0.15s ease;
        cursor: pointer;
        box-shadow: 5px 5px 0 #000;
    }

    .tf-button:hover {
        background: #000;
        color: #fff;
        transform: translate(5px, 5px);
        box-shadow: 0px 0px 0 #000;
    }

    /* Typography improvements */
    h1, h2, h3, h4, h5, h6 {
        font-family: 'Inter', 'Arial Black', sans-serif;
        margin-top: 2.2rem;
        margin-bottom: 1.2rem;
        line-height: 1.3;
        text-transform: uppercase;
        font-weight: 900;
    }

    h1 {
        font-size: 2.4rem;
        margin-left: -5px;
        border-bottom: 5px solid;
        padding-bottom: 0.4rem;
        display: inline-block;
    }

    h2 {
        font-size: 1.8rem;
        border-left: 8px solid;
        padding-left: 1rem;
    }

    /* Link styling */
    a {
        color: #000;
        text-decoration: none;
        font-weight: bold;
        background-color: #ff0;
        padding: 0 4px;
        transition: all 0.15s ease;
        box-shadow: 3px 3px 0 #000;
        position: relative;
        display: inline-block;
    }

    a:hover {
        transform: translate(3px, 3px);
        box-shadow: 0px 0px 0 #000;
    }

    /* Dark mode link styling */
    @media (prefers-color-scheme: dark) {
        a {
            color: #000;
            background-color: #ff0;
            box-shadow: 3px 3px 0 #fff;
        }
        
        a:hover {
            transform: translate(3px, 3px);
            box-shadow: 0px 0px 0 #fff;
        }
        
        h1, h2 {
            color: #fff;
        }
    }

    /* Generic elements */
    hr {
        margin: 2.5rem 0;
        border: none;
        height: 3px;
        background-color: #000;
    }

    /* Lists with better styling */
    ul, ol {
        padding-left: 1.5rem;
    }
    
    ul li, ol li {
        margin-bottom: 0.5rem;
        position: relative;
    }
    
    ul li::before {
        content: '█';
        position: absolute;
        left: -1.2rem;
        color: #000;
    }
    
    @media (prefers-color-scheme: dark) {
        hr { 
            background-color: #fff; 
        }
        
        ul li::before {
            color: #fff;
        }
    }

    /* Remove legacy styles */
    .mcq-feedback-area,
    .multiple-choice button::after,
    .multiple-choice button.correct::after,
    .multiple-choice button.incorrect::after {
        display: none;
    }

    /* Code/pre selector to remove underlines */
    pre *, code * {
        text-decoration: none !important;
        border-bottom: none !important;
    }
    """

def get_contemporary_style():
    """Return a contemporary card style."""
    return """/* Contemporary style - Clean, modern, with subtle elegance */
    .card {
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        padding: 1rem;
        background-color: #f8f9fa;
    }

    .content {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        transition: all 0.3s ease;
        background-color: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.05);
    }

    /* Light/Dark mode */
    @media (prefers-color-scheme: light) {
        .card { background-color: #f8f9fa; }
        .content {
            background-color: #ffffff;
            color: #2d3748;
        }
        .category { 
            color: #4a5568; 
            background: linear-gradient(135deg, #e6f7ff, #f0f7ff);
            border-left: 4px solid #3498db;
        }
        pre, code { 
            background-color: #f7fafc; 
            border: 1px solid #e2e8f0;
            border-radius: 6px;
        }
    }

    @media (prefers-color-scheme: dark) {
        .card { background-color: #1a202c; }
        .content {
            background-color: #2d3748;
            color: #e5e7eb;
        }
        .category { 
            color: #cbd5e0; 
            background: linear-gradient(135deg, #2a4365, #2c5282);
            border-left: 4px solid #63b3ed;
        }
        pre, code { 
            background-color: #1a202c; 
            border: 1px solid #4a5568;
            border-radius: 6px;
        }
    }

    /* Category */
    .category {
        font-size: 0.875em;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 1.5rem;
        padding: 0.75rem 1rem;
        border-radius: 8px;
    }

    /* MCQ specific styling */
    .mcq-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        max-width: 600px;
        margin: 20px auto;
        padding: 0 1rem;
    }

    .mcq-question {
        font-size: 1.05em;
        margin-bottom: 20px;
        padding: 1.2rem;
        border-radius: 12px;
        background: linear-gradient(135deg, #f9f9f9, #f3f4f6);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.03);
        width: 100%;
        box-sizing: border-box;
        border-left: 4px solid #6366f1;
    }

    .multiple-choice {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        width: 100%;
    }

    .mcq-option {
        width: 100%;
        margin: 0.4rem 0;
        padding: 1rem 1.2rem;
        border: 1px solid rgba(209, 213, 219, 0.5);
        border-radius: 10px;
        background: linear-gradient(135deg, #ffffff, #f9fafb);
        color: inherit;
        cursor: pointer;
        transition: all 0.2s ease;
        box-sizing: border-box;
        word-break: break-word;
        overflow-wrap: break-word;
    }

    .mcq-option:hover:not(.disabled):not(.clicked) {
        background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
        border-color: rgba(107, 114, 128, 0.3);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    .mcq-option.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .mcq-option.clicked {
        pointer-events: none;
    }

    /* MCQ option content layout */
    .mcq-option-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        gap: 12px;
        min-height: 24px;
    }

    .mcq-option-text {
        flex: 1;
        padding-right: 0.5rem;
        line-height: 1.4;
        display: flex;
        align-items: center;
    }

    .mcq-result-icon {
        font-size: 1.1em;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        height: 24px;
        margin-top: 2px;
    }

    /* True/False styles */
    .true-false-container {
        display: flex;
        gap: 1rem;
        margin: 1.5rem 0;
    }

    .tf-button {
        flex: 1;
        padding: 1rem;
        border: 1px solid rgba(209, 213, 219, 0.5);
        border-radius: 10px;
        background: linear-gradient(135deg, #ffffff, #f9fafb);
        color: inherit;
        font-weight: 500;
        text-align: center;
        transition: all 0.2s ease;
        cursor: pointer;
    }

    .tf-button:hover {
        background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
        border-color: rgba(107, 114, 128, 0.3);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    /* Code blocks */
    pre {
        padding: 1.25rem;
        margin: 1.5rem 0;
        overflow-x: auto;
        line-height: 1.45;
    }

    code {
        padding: 0.2em 0.4em;
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        font-size: 0.9em;
    }

    /* True option styling */
    .tf-button.true {
        border-left: 4px solid #10b981;
    }

    /* False option styling */
    .tf-button.false {
        border-left: 4px solid #ef4444;
    }

    /* Generic elements */
    hr {
        margin: 2rem 0;
        border: none;
        height: 1px;
        background: linear-gradient(to right, transparent, rgba(209, 213, 219, 0.7), transparent);
    }

    /* Remove legacy styles */
    .mcq-feedback-area,
    .multiple-choice button::after,
    .multiple-choice button.correct::after,
    .multiple-choice button.incorrect::after {
        display: none;
    }
    """



