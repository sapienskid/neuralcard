# NeuralCard - AI Coding Agent Instructions

## Project Overview
NeuralCard is a sophisticated Obsidian plugin that creates Anki flashcards from markdown notes. It features a **hybrid TypeScript-Python architecture** where the TypeScript frontend manages Obsidian integration while Python handles complex card generation with the `genanki` library.

## Architecture Understanding

### Dual-Language Design
- **TypeScript (`main.ts`)**: Obsidian plugin interface, UI, settings, command registration
- **Python (`scripts/`)**: Card parsing, validation, Anki deck generation
- **Communication**: TypeScript spawns Python processes with temporary files as data exchange

### Key Components
- **Frontend**: `main.ts` - Plugin lifecycle, ribbon button, settings tab, template insertion
- **Python Entry**: `scripts/create_flashcards.py` - Main script called by TypeScript 
- **Card Processing**: `scripts/python_card_script.py` - Core deck generation logic
- **Utilities**: `scripts/util/` - Modular parsing, validation, styling, logging

### Data Flow
1. User clicks ribbon → TypeScript reads active file → Writes temp file
2. Spawns Python with args: `note_path deck_folder deck_name tags --card-style style`
3. Python parses markdown → validates cards → creates Anki package → saves `.apkg`
4. TypeScript cleans up temp files based on settings

## Critical Development Patterns

### Python Environment Management
```typescript
// Always check Python path before operations
if (!this.pythonPath) {
    this.pythonPath = await this.findSystemPython();
}
await this.ensurePythonPackages(this.pythonPath);
```

### Card Type System
Cards are parsed from HTML comments in markdown:
```markdown
<!-- Anki Card -->
<!-- type: basic|cloze|multiple-choice|fill-in-the-blank -->
<!-- front -->
Content
<!-- back -->
Answer
<!-- tags: tag1, tag2 -->
```

### Error Recovery Pattern
Always implement fallbacks for Python failures:
```python
try:
    # Main card creation logic
except Exception as e:
    return create_emergency_deck(deck_name, str(e))
```

## Essential Commands

### Development Workflow
```bash
# Build plugin (TypeScript → JavaScript)
npm run build

# Development with watch mode
npm run dev

# Test Python script directly
cd scripts && python3 create_flashcards.py note.txt output/ deck_name "tags" --debug
```

### Python Module Structure
- `util/markdown_parser.py` - Extracts cards from markdown comments
- `util/card_validator.py` - Validates/fixes card formatting with auto-correction
- `basic_card_handlers.py` - Individual card type processors
- `util/styling.py` - CSS generation for different card themes

## Project-Specific Conventions

### Settings Architecture
Settings are deeply integrated - changing `cardStyle` requires CSS regeneration:
```typescript
// Settings affect both TypeScript UI and Python styling
this.plugin.settings.cardStyle = value;
await this.plugin.saveSettings();
// Python receives this via --card-style argument
```

### Logging Strategy
- **TypeScript**: Minimal console logging, user notifications via `Notice`
- **Python**: Comprehensive logging to `scripts/logs/` with debug levels
- **Debug Mode**: Controlled via settings, enables verbose Python output

### Template System
Card templates are defined in TypeScript but used via hotkeys:
```typescript
const CARD_TEMPLATES: Record<CardTemplateType, string> = {
    basic: `<!-- Anki Card -->...`,
    // Templates available via commands like 'flashcard-maker:insert-basic-card'
}
```

### Cross-Platform Considerations
- **Linux-focused**: Primary development/testing platform
- **Python Detection**: Multiple fallback paths for different OS Python installations
- **Path Handling**: Uses Node.js `path.join()` for cross-platform compatibility

## Integration Points

### Obsidian API Usage
- `app.workspace.getActiveFile()` - Get current note
- `app.vault.read(file)` - Read note content  
- `addRibbonIcon()` - Main plugin trigger
- `addCommand()` - Hotkey-triggered template insertion

### Python Dependencies
- `genanki` - Core Anki package generation (auto-installed)
- `markdown2` - Markdown processing (auto-installed)
- Standard library only for utilities

### File Management
- **Temp files**: Created in `temp/` directory, cleaned based on `keepTempFiles` setting
- **Logs**: Stored in `scripts/logs/` with retention policies
- **Output**: Anki `.apkg` files saved to user-configured `deckFolder`

## Common Debugging Patterns

### Enable Debug Mode
1. Settings → Debug Mode → Enable
2. Check `scripts/logs/` for detailed Python execution logs
3. Enable "Keep Temporary Files" to inspect data exchange

### Python Path Issues
The plugin auto-detects Python but allows manual override in settings. Common fixes:
- Check `PYTHON_PATH` environment variable
- Verify Python 3.x installation with `genanki` support
- Use absolute paths in settings for custom Python installations

### Card Validation Failures
Cards go through strict validation in `card_validator.py` with auto-correction:
- Missing fields get default values
- Type mismatches are auto-corrected
- Invalid cards are logged but don't stop processing

## Design Guidelines

### Default Style Philosophy
The default card style follows **clean, simple, modern design principles**:

#### Visual Hierarchy
- **Typography**: Sans-serif system fonts (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`)
- **Layout**: Centered content with max-width constraints (800px)
- **Spacing**: Generous padding (2rem) with consistent margins
- **Colors**: Subtle grays with blue accent (#3498db) for active elements

#### Responsive Design
```css
/* Mobile-first approach with breakpoints */
@media screen and (max-width: 480px) {
    .content { padding: 1rem; }
    .mcq-option { padding: 1rem; }
}
```

#### Dark/Light Mode Support
```css
/* Automatic theme switching */
@media (prefers-color-scheme: light) {
    .content { background: #ffffff; color: #2c3e50; }
}
@media (prefers-color-scheme: dark) {
    .content { background: #2d333b; color: #e6edf3; }
}
```

### Custom Style Creation

#### Style System Architecture
All styles are managed in `scripts/util/styling.py`:
```python
def get_card_styles(style_name="default"):
    styles = {
        "default": get_default_style(),
        "retro": get_retro_style(),
        "minimal": get_minimal_style(),
        # Add custom styles here
    }
    return styles.get(style_name, styles["default"])
```

#### Adding New Styles
1. **Create style function** in `styling.py`:
```python
def get_custom_style():
    return """/* Custom style CSS */
    .card { /* Your base styles */ }
    .content { /* Content container */ }
    /* Include all required selectors */
    """
```

2. **Register in styles dict** within `get_card_styles()`
3. **Update settings dropdown** in `main.ts`:
```typescript
.addOption('custom', 'Custom Style Name')
```

#### Required CSS Selectors
Every style must include these core selectors:
```css
.card                    /* Base card container */
.content                 /* Main content area */
.category               /* Card category/tags */
.mcq-section            /* Multiple choice container */
.mcq-option             /* Individual options */
.true-false-container   /* True/false button container */
.tf-button              /* True/false buttons */
hr                      /* Dividers */
```

#### Style Design Principles
- **Accessibility**: Minimum 4.5:1 color contrast ratio
- **Readability**: Line height 1.4-1.7, adequate font sizes (16px+)
- **Consistency**: Unified spacing system using rem units
- **Performance**: Minimal CSS with efficient selectors
- **Cross-platform**: Test on mobile, desktop, light/dark modes

### Style Testing Workflow
```bash
# Test style changes
cd scripts
python3 create_flashcards.py example.txt output/ test_deck "test" --card-style custom --debug

# Verify in Anki
# 1. Import generated .apkg file
# 2. Check card appearance in review mode
# 3. Test on mobile Anki app
```

## When Making Changes

- **TypeScript changes**: Run `npm run build` to update `main.js`
- **Python changes**: No build step needed, but test with `--debug` flag
- **Settings changes**: Update both `DEFAULT_SETTINGS` and settings tab UI
- **New card types**: Add to `CARD_TEMPLATES`, `card_handlers`, and validation logic
- **CSS/Styling**: Modify `util/styling.py` and consider card style compatibility
- **New styles**: Follow the style creation workflow above, test across devices

This plugin exemplifies modern polyglot development with robust error handling and user experience considerations across the TypeScript-Python boundary.