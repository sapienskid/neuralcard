# NeuralCard - AI-Powered Flashcard Maker for Obsidian

Create powerful Anki flashcards directly from your Obsidian.

> **Note**: Currently, this plugin has only been tested on Linux systems. While it may work on other platforms, your mileage may vary. I welcome testing and feedback from Windows and macOS users.

## Features

- **Multiple Card Types**: Create basic, cloze, fill-in-the-blank, and other card formats
- **AI-Enhanced Processing**: Smart parsing of your notes for optimal flashcard creation
- **LaTeX Math Support**: Full support for mathematical notation
- **Code Syntax Highlighting**: Perfect for programming and technical content
- **Customizable Card Styles**: Choose from 7 beautiful visual themes
- **Media Integration**: Include images and other media in your cards
- **Automatic Cleanup**: Smart management of temporary files

## Installation

1. Install the plugin through the Obsidian Community Plugins browser
2. Make sure Python 3.x is installed on your system
3. The plugin will automatically install required Python packages (`genanki` and `markdown2`) when it first loads
4. Configure your preferred settings

Note: If you experience issues with Python package installation:
- Ensure you have Python 3.x installed and accessible from your system PATH
- Check your internet connection as packages need to be downloaded
- Try running pip manually: `pip install --user genanki markdown2`
- Enable Debug Mode in settings for detailed logs

## Usage

1. Install the plugin through the Obsidian Community Plugins browser
2. Configure your preferred settings
3. Open any note and click the NeuralCard icon in the ribbon
4. Your flashcards will be created automatically!

## Settings

### General Settings
- **Deck Folder**: Where your Anki decks are saved
- **Default Deck Name**: Default name for new decks
- **Default Tags**: Default tags for all cards
- **Card Style**: Choose from different visual styles:
  - Modern (Default)
  - Retro
  - Minimal
  - Bauhaus
  - Brutalist
  - Contemporary
  - Colorful

### Advanced Settings
- **Custom CSS**: Add your own CSS styling
- **Media Folder**: Location for media files
- **AnkiConnect URL**: Configure AnkiConnect integration
- **Keep Temporary Files**: For debugging purposes
- **Debug Mode**: Enable detailed logging
- **Python Path**: Custom Python executable path

## Upcoming Features

- **AnkiConnect Direct Sync**: Instantly add cards to your Anki collection
- **Quick Creation Menu**: Floating editor for rapid flashcard creation
- **Template Library**: Share and use community-created card templates
- **Keyboard Shortcuts**: 
  - Quick card creation with customizable keybindings
  - Hotkeys for different card types (Basic, Cloze, Math, Code)


## Technical Details

- The plugin uses Python (3.x required) with the genanki library for card generation
- Temporary files are managed automatically based on your settings
- Logs are stored in the plugin's "logs" directory

## Development Notes

This plugin was developed with extensive use of AI assistance, particularly GitHub Copilot and the Copilot Agent. AI tools were instrumental in:
- Optimizing the flashcard creation algorithms
- Improving code quality and maintainability
- Generating robust error handling
- Developing the Python integration layer
- Creating the card styling system

The AI assistance helped create a more reliable and feature-rich plugin while maintaining clean, well-documented code.

## System Requirements

- Obsidian v0.15.0 or higher
- Python 3.x
- Linux operating system (currently tested only on Linux)
- Internet connection (for initial Python package installation)

## Troubleshooting

If you encounter issues:

1. Enable Debug Mode in settings
2. Enable Keep Temporary Files
3. Check the logs directory
4. Verify Python installation (3.x required)
5. Note: If you're using Windows or macOS, please report any issues on GitHub as I'm actively working on cross-platform support

For detailed flashcard formatting instructions, see [Flashcard Format Guide](docs/FLASHCARD_GUIDE.md) or check the plugin settings.

## Contributing

Your contributions are welcome! Please see the GitHub repository for details.

## License

This project is licensed under the OBSD License - see the LICENSE file for details.
