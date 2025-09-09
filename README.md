# NeuralCard - Flashcard Maker for Obsidian

Create Anki flashcards directly from your Obsidian notes using a hybrid TypeScript-Python architecture.

> **Note**: Currently tested on Linux systems. May work on other platforms with adjustments.

## Features

- **Multiple Card Types**: Basic, cloze, fill-in-the-blank, multiple-choice, true/false, and math cards
- **Smart Parsing**: Automated processing of markdown notes for flashcard creation
- **LaTeX Math Support**: Full mathematical notation support
- **Code Syntax Highlighting**: Perfect for technical content
- **Customizable Styles**: Multiple visual themes (Modern, Retro, Minimal)
- **Media Integration**: Include images and media in cards
- **Python Backend**: Robust card generation using genanki library
- **Automatic Cleanup**: Smart temporary file management

## Installation

### Via Community Plugins (Recommended)

1. Open Obsidian Settings → Community Plugins → Disable Safe Mode
2. Search for "NeuralCard" and install
3. Enable the plugin

### Manual Installation

1. Download from [GitHub](https://github.com/sapienskid/neuralcard)
2. Extract to `.obsidian/plugins/neuralcard-flashcards/`
3. Reload Obsidian and enable the plugin

### Requirements

- Obsidian v0.15.0+
- Python 3.x
- Internet connection for initial package installation

The plugin auto-installs required Python packages (`genanki`, `markdown2`).

## Usage

1. Configure settings (deck folder, default tags, card style)
2. Use hotkeys to insert card templates:
   - Basic: `flashcard-maker:insert-basic-card`
   - Cloze: `flashcard-maker:insert-cloze-card`
   - Fill-in-the-Blank: `flashcard-maker:insert-fill-in-blank-card`
   - Multiple Choice: `flashcard-maker:insert-multiple-choice-card`
   - True/False: `flashcard-maker:insert-true-false-card`
   - Math: `flashcard-maker:insert-math-card`
3. Click the NeuralCard ribbon icon to generate flashcards from your note

## Card Syntax

Use HTML comments in markdown:

```markdown
<!-- Anki Card -->
<!-- type: basic|cloze|multiple-choice|fill-in-the-blank|true-false|math -->
<!-- front -->
Question here
<!-- back -->
Answer here
<!-- tags: tag1, tag2 -->
```

See [Flashcard Format Guide](docs/flashcard_guide.md) for details.

## Settings

- **Deck Folder**: Output location for .apkg files
- **Default Deck Name**: Name for new decks
- **Default Tags**: Tags for all cards
- **Card Style**: Visual theme selection
- **Media Folder**: Media file location
- **Keep Temporary Files**: For debugging
- **Debug Mode**: Enable detailed logging
- **Python Path**: Custom Python executable

## Troubleshooting

1. Enable Debug Mode and Keep Temporary Files
2. Check `scripts/logs/` for errors
3. Verify Python 3.x installation
4. Ensure packages are installed: `pip install genanki markdown2`

## Technical Details

- TypeScript frontend manages Obsidian integration
- Python backend handles card parsing and Anki package generation
- Temporary files managed automatically
- Logs stored in `scripts/logs/`
- This plugin is vibe coded

## System Requirements

- Obsidian v0.15.0+
- Python 3.x
- Linux (primary), Windows/macOS may require adjustments

## Contributing

Contributions welcome at [GitHub](https://github.com/sapienskid/neuralcard).

## License

OBSD License - see LICENSE file.
