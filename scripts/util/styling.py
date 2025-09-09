def get_card_styles(style_name="default", custom_css=""):
    """Return unified CSS styles for all card types based on the selected style.

    Args:
        style_name (str): The name of the style to use (default)
        custom_css (str): Additional custom CSS to append

    Returns:
        str: CSS styles for cards
    """
    styles = {
        "default": get_default_style(),
    }

    base_css = styles.get(style_name, styles["default"])

    # Append custom CSS if provided
    if custom_css and custom_css.strip():
        base_css += "\n\n/* Custom CSS */\n" + custom_css.strip()

    return base_css

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

