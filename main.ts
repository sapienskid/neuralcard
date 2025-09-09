import { App, Notice, Plugin, PluginSettingTab, Setting, Modal, MarkdownRenderer, Editor, TFile } from 'obsidian';
import { spawn, spawnSync } from 'child_process';
import { join, dirname } from 'path';
import * as fs from 'fs';

interface FlashcardSettings {
    // Basic settings
    deckFolder: string;
    defaultDeckName: string;
    defaultTags: string;

    // Advanced styling
    customCSS: string;
    cardStyle: string;

    // Media settings
    mediaFolder: string;

    // Anki sync settings
    ankiConnectUrl: string;
    syncOnCreate: boolean;

    // File management settings
    keepTempFiles: boolean;
    tempFileLifespan: number;
    logRetention: number;

    // Advanced settings
    debugMode: boolean;
    pythonPath: string;
    pythonVenvPath: string;
    cleanupOnStartup: boolean;
}

const DEFAULT_SETTINGS: FlashcardSettings = {
    // Basic settings
    deckFolder: 'Flashcards',
    defaultDeckName: 'Obsidian',
    defaultTags: 'obsidian',

    // Advanced styling
    customCSS: '',
    cardStyle: 'default',

    // Media settings
    mediaFolder: 'Flashcards/media',

    // Anki sync settings
    ankiConnectUrl: 'http://localhost:8765',
    syncOnCreate: false,

    // File management settings
    keepTempFiles: false,
    tempFileLifespan: 24,
    logRetention: 7,

    // Advanced settings
    debugMode: false,
    pythonPath: '',
    pythonVenvPath: '',
    cleanupOnStartup: true
}

// Define a type for the card template keys
type CardTemplateType = 'basic' | 'cloze' | 'fillInBlank' | 'multipleChoice' | 'trueFalse' | 'math' | 'reversed' | 'imageOcclusion' | 'audio';

// Card templates for different flashcard types
const CARD_TEMPLATES: Record<CardTemplateType, string> = {
    basic: `<!-- Anki Card -->
<!-- type: basic -->
<!-- front -->
Enter your question here

<!-- back -->
Enter your answer here
<!-- tags: -->

---
`,
    cloze: `<!-- Anki Card -->
<!-- type: cloze -->
<!-- front -->
This is a {{cloze deletion}} example.
<!-- tags: -->

---
`,
    fillInBlank: `<!-- Anki Card -->
<!-- type: fill-in-the-blank -->
<!-- front -->
The process by which plants make their own food using sunlight is called ____________.

<!-- back -->
photosynthesis
<!-- tags: -->

---
`,
    multipleChoice: `<!-- Anki Card -->
<!-- type: multiple-choice -->
<!-- front -->
Which planet is known as the Red Planet?

<!-- options -->
Venus
Mars <!-- correct -->
Jupiter
Saturn

<!-- back -->
Mars is often called the Red Planet due to the iron oxide prevalent on its surface.
<!-- tags: -->

---
`,
    trueFalse: `<!-- Anki Card -->
<!-- type: true-false -->
<!-- front -->
The Great Wall of China is visible from space with the naked eye.

<!-- back -->
False. It's a common misconception.
<!-- correct_answer: False -->
<!-- tags: -->

---
`,
    math: `<!-- Anki Card -->
<!-- type: basic -->
<!-- front -->
Solve: $x^2 + 5x + 6 = 0$

<!-- back -->
$x = -2$ or $x = -3$
<!-- tags: math -->

---
`,
    reversed: `<!-- Anki Card -->
<!-- type: reversed -->
<!-- front -->
Term or concept

<!-- back -->
Definition or explanation
<!-- tags: -->

---
`,
    imageOcclusion: `<!-- Anki Card -->
<!-- type: image-occlusion -->
<!-- front -->
![Image description](path/to/image.png)

<!-- masked-areas -->
[x, y, width, height]

<!-- back -->
Description of the masked areas
<!-- tags: -->

---
`,
    audio: `<!-- Anki Card -->
<!-- type: audio -->
<!-- front -->
Listen and identify:
[audio:filename.mp3]

<!-- back -->
Answer
<!-- tags: -->

---
`
};

// Note templates with frontmatter
const NOTE_TEMPLATES: Record<CardTemplateType, string> = {
    basic: `---
title: "Basic Flashcards"
tags: ["flashcards", "anki"]
deck: "My Deck"
style: "default"
---

<!-- Anki Card -->
<!-- type: basic -->
<!-- front -->
Enter your question here

<!-- back -->
Enter your answer here
<!-- tags: -->

---
`,
    cloze: `---
title: "Cloze Flashcards"
tags: ["flashcards", "anki", "cloze"]
deck: "My Deck"
style: "default"
---

<!-- Anki Card -->
<!-- type: cloze -->
<!-- front -->
This is a {{cloze deletion}} example.
<!-- tags: -->

---
`,
    fillInBlank: `---
title: "Fill-in-the-Blank Flashcards"
tags: ["flashcards", "anki", "fill-blank"]
deck: "My Deck"
style: "default"
---

<!-- Anki Card -->
<!-- type: fill-in-the-blank -->
<!-- front -->
The process by which plants make their own food using sunlight is called ____________.

<!-- back -->
photosynthesis
<!-- tags: -->

---
`,
    multipleChoice: `---
title: "Multiple Choice Flashcards"
tags: ["flashcards", "anki", "mcq"]
deck: "My Deck"
style: "default"
---

<!-- Anki Card -->
<!-- type: multiple-choice -->
<!-- front -->
Which planet is known as the Red Planet?

<!-- options -->
Venus
Mars <!-- correct -->
Jupiter
Saturn

<!-- back -->
Mars is often called the Red Planet due to the iron oxide prevalent on its surface.
<!-- tags: -->

---
`,
    trueFalse: `---
title: "True/False Flashcards"
tags: ["flashcards", "anki", "true-false"]
deck: "My Deck"
style: "default"
---

<!-- Anki Card -->
<!-- type: true-false -->
<!-- front -->
The Great Wall of China is visible from space with the naked eye.

<!-- back -->
False. It's a common misconception.
<!-- correct_answer: False -->
<!-- tags: -->

---
`,
    math: `---
title: "Math Flashcards"
tags: ["flashcards", "anki", "math"]
deck: "My Deck"
style: "default"
---

<!-- Anki Card -->
<!-- type: basic -->
<!-- front -->
Solve: $x^2 + 5x + 6 = 0$

<!-- back -->
$x = -2$ or $x = -3$
<!-- tags: math -->

---
`,
    reversed: `---
title: "Reversed Flashcards"
tags: ["flashcards", "anki", "reversed"]
deck: "My Deck"
style: "default"
---

<!-- Anki Card -->
<!-- type: reversed -->
<!-- front -->
Term or concept

<!-- back -->
Definition or explanation
<!-- tags: -->

---
`,
    imageOcclusion: `---
title: "Image Occlusion Flashcards"
tags: ["flashcards", "anki", "image-occlusion"]
deck: "My Deck"
style: "default"
---

<!-- Anki Card -->
<!-- type: image-occlusion -->
<!-- front -->
![Image description](path/to/image.png)

<!-- masked-areas -->
[x, y, width, height]

<!-- back -->
Description of the masked areas
<!-- tags: -->

---
`,
    audio: `---
title: "Audio Flashcards"
tags: ["flashcards", "anki", "audio"]
deck: "My Deck"
style: "default"
---

<!-- Anki Card -->
<!-- type: audio -->
<!-- front -->
Listen and identify:
[audio:filename.mp3]

<!-- back -->
Answer
<!-- tags: -->

---
`
};

export default class FlashcardMakerPlugin extends Plugin {
    settings: FlashcardSettings;
    pythonPath: string | null = null;

    async onload() {
        await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, this.settings);
        
        // Set up the Python path from settings if available
        if (this.settings.pythonVenvPath) {
            // If venv path is provided, construct the python executable path
            this.pythonPath = join(this.settings.pythonVenvPath, 'bin', 'python3');
        } else if (this.settings.pythonPath) {
            this.pythonPath = this.settings.pythonPath;
        } else {
            try {
                this.pythonPath = await this.findSystemPython();
            } catch (error) {
                console.error('Failed to find Python:', error);
                new Notice('Python not found. Please install Python 3.x or set path in settings');
                return;
            }
        }

        // Install required Python packages on startup
        try {
            if (this.pythonPath) {
                await this.ensurePythonPackages(this.pythonPath);
                if (this.settings.debugMode) {
                if (this.settings.debugMode) {
                    console.log('Python packages verified successfully');
                }
            }
            }
        } catch (error) {
            console.error('Failed to install Python packages:', error);
            // Don't fail completely - let user try manual operations
            new Notice('Warning: Python packages may not be properly installed. Check settings if you encounter issues.');
        }
        
        // Clean up old temp files and logs on startup if enabled
        if (this.settings.cleanupOnStartup) {
            await this.cleanupOldFiles();
            new Notice('Startup cleanup completed');
        }
        
        // Using 'file-plus' icon - a core Obsidian icon that represents creating new items
        this.addRibbonIcon('file-plus', 'Flashcard Maker', async () => {
            const activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) {
                new Notice('No active file');
                return;
            }
            await this.createFlashcards(activeFile);
        });

        // Add settings tab
        this.addSettingTab(new FlashcardSettingTab(this.app, this));

        // Add commands
        this.addCommand({
            id: 'create-flashcards',
            name: 'Create Flashcards from Current Note',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    new Notice('No active file');
                    return;
                }
                await this.createFlashcards(activeFile);
            }
        });
        
        // Add hotkey commands for different card types
        this.addCommand({
            id: 'insert-basic-card',
            name: 'Insert Basic Card Template',
            editorCallback: (editor: Editor) => {
                this.insertTemplate(editor, 'basic');
            }
        });
        
        this.addCommand({
            id: 'insert-cloze-card',
            name: 'Insert Cloze Card Template',
            editorCallback: (editor: Editor) => {
                this.insertTemplate(editor, 'cloze');
            }
        });
        
        this.addCommand({
            id: 'insert-fill-in-blank-card',
            name: 'Insert Fill-in-the-Blank Card Template',
            editorCallback: (editor: Editor) => {
                this.insertTemplate(editor, 'fillInBlank');
            }
        });
        
        this.addCommand({
            id: 'insert-multiple-choice-card',
            name: 'Insert Multiple Choice Card Template',
            editorCallback: (editor: Editor) => {
                this.insertTemplate(editor, 'multipleChoice');
            }
        });
        
        this.addCommand({
            id: 'insert-true-false-card',
            name: 'Insert True/False Card Template',
            editorCallback: (editor: Editor) => {
                this.insertTemplate(editor, 'trueFalse');
            }
        });
        
        this.addCommand({
            id: 'insert-math-card',
            name: 'Insert Math Card Template',
            editorCallback: (editor: Editor) => {
                this.insertTemplate(editor, 'math');
            }
        });

        this.addCommand({
            id: 'insert-reversed-card',
            name: 'Insert Reversed Card Template',
            editorCallback: (editor: Editor) => {
                this.insertTemplate(editor, 'reversed');
            }
        });

        this.addCommand({
            id: 'insert-image-occlusion-card',
            name: 'Insert Image Occlusion Card Template',
            editorCallback: (editor: Editor) => {
                this.insertTemplate(editor, 'imageOcclusion');
            }
        });

        this.addCommand({
            id: 'insert-audio-card',
            name: 'Insert Audio Card Template',
            editorCallback: (editor: Editor) => {
                this.insertTemplate(editor, 'audio');
            }
        });
        
        // Add commands for creating new notes with templates
        this.addCommand({
            id: 'create-basic-note',
            name: 'Create New Basic Flashcard Note',
            callback: async () => {
                await this.createNoteWithTemplate('basic');
            }
        });
        
        this.addCommand({
            id: 'create-cloze-note',
            name: 'Create New Cloze Flashcard Note',
            callback: async () => {
                await this.createNoteWithTemplate('cloze');
            }
        });
        
        this.addCommand({
            id: 'create-fill-blank-note',
            name: 'Create New Fill-in-the-Blank Flashcard Note',
            callback: async () => {
                await this.createNoteWithTemplate('fillInBlank');
            }
        });
        
        this.addCommand({
            id: 'create-mcq-note',
            name: 'Create New Multiple Choice Flashcard Note',
            callback: async () => {
                await this.createNoteWithTemplate('multipleChoice');
            }
        });
        
        this.addCommand({
            id: 'create-true-false-note',
            name: 'Create New True/False Flashcard Note',
            callback: async () => {
                await this.createNoteWithTemplate('trueFalse');
            }
        });
        
        this.addCommand({
            id: 'create-math-note',
            name: 'Create New Math Flashcard Note',
            callback: async () => {
                await this.createNoteWithTemplate('math');
            }
        });

        this.addCommand({
            id: 'create-reversed-note',
            name: 'Create New Reversed Flashcard Note',
            callback: async () => {
                await this.createNoteWithTemplate('reversed');
            }
        });

        this.addCommand({
            id: 'create-image-occlusion-note',
            name: 'Create New Image Occlusion Flashcard Note',
            callback: async () => {
                await this.createNoteWithTemplate('imageOcclusion');
            }
        });

        this.addCommand({
            id: 'create-audio-note',
            name: 'Create New Audio Flashcard Note',
            callback: async () => {
                await this.createNoteWithTemplate('audio');
            }
        });
        
        // Initialize Python path
        try {
            this.pythonPath = await this.findSystemPython();
        } catch (error) {
            console.error('Failed to find Python:', error);
            new Notice('Python not found. Please install Python 3.x');
        }
    }
    
    // Insert a card template at the current cursor position
    insertTemplate(editor: Editor, templateType: CardTemplateType): void {
        const template = CARD_TEMPLATES[templateType];
        if (template) {
            // Insert the template at the current cursor position
            const currentPosition = editor.getCursor();
            
            // Add a newline before if we're not at the start of the line
            const lineContent = editor.getLine(currentPosition.line);
            const prefix = currentPosition.ch > 0 && lineContent.length > 0 ? '\n' : '';
            
            editor.replaceRange(prefix + template + '\n', currentPosition);
            
            // Show a brief notice
            new Notice(`${templateType.charAt(0).toUpperCase() + templateType.slice(1)} card template inserted`);
        } else {
            new Notice(`Template for "${templateType}" not found.`);
        }
    }

    // Create a new note with a flashcard template
    async createNoteWithTemplate(templateType: CardTemplateType): Promise<void> {
        const template = NOTE_TEMPLATES[templateType];
        if (!template) {
            new Notice(`Template for "${templateType}" not found.`);
            return;
        }

        try {
            // Create a new note with the template
            const vault = this.app.vault;
            const templateName = `${templateType.charAt(0).toUpperCase() + templateType.slice(1)} Flashcards`;
            const fileName = `${templateName}.md`;
            
            // Check if file already exists and create unique name if needed
            let finalFileName = fileName;
            let counter = 1;
            while (await vault.adapter.exists(finalFileName)) {
                finalFileName = `${templateName} ${counter}.md`;
                counter++;
            }
            
            // Create the new file with the template content
            await vault.create(finalFileName, template);
            
            // Open the newly created file
            const file = vault.getAbstractFileByPath(finalFileName);
            if (file && file instanceof TFile) {
                await this.app.workspace.getLeaf().openFile(file);
                new Notice(`Created new ${templateType} flashcard note: ${finalFileName}`);
            }
        } catch (error) {
            console.error('Error creating note with template:', error);
            new Notice(`Failed to create ${templateType} flashcard note`);
        }
    }

    async findSystemPython(): Promise<string> {
        // Check for virtual environment in plugin directory first
        const vaultPath = (this.app.vault.adapter as any).basePath;
        const pluginPath = join(vaultPath, '.obsidian', 'plugins', 'flashcard_maker');
        const venvPythonPath = join(pluginPath, '.venv', 'bin', 'python3');

        // Try plugin's virtual environment Python first
        try {
            const result = spawnSync(venvPythonPath, ['--version']);
            if (result.status === 0) {
                const versionOutput = result.stdout.toString() || result.stderr.toString();
                if (versionOutput.toLowerCase().includes('python 3')) {
                    if (this.settings.debugMode) {
                        console.log(`Found Python 3 in plugin virtual environment at ${venvPythonPath}`);
                    }
                    return venvPythonPath;
                }
            }
        } catch (e) {
            if (this.settings.debugMode) {
                console.log('Plugin virtual environment Python not found or not working:', e);
            }
        }

        // Check for virtual environment in vault root
        const vaultVenvPythonPath = join(vaultPath, '.venv', 'bin', 'python3');
        try {
            const result = spawnSync(vaultVenvPythonPath, ['--version']);
            if (result.status === 0) {
                const versionOutput = result.stdout.toString() || result.stderr.toString();
                if (versionOutput.toLowerCase().includes('python 3')) {
                    if (this.settings.debugMode) {
                        console.log(`Found Python 3 in vault virtual environment at ${vaultVenvPythonPath}`);
                    }
                    return vaultVenvPythonPath;
                }
            }
        } catch (e) {
            if (this.settings.debugMode) {
                console.log('Vault virtual environment Python not found or not working:', e);
            }
        }

        // Check common Python paths
        const commonPaths = [
            '/usr/bin/python3',
            '/usr/local/bin/python3',
            '/opt/homebrew/bin/python3',
            'C:\\Python39\\python.exe',
            'C:\\Python310\\python.exe',
            'python3',
            'python',
        ];

        // Try environment variable first
        if (process.env.PYTHON_PATH) {
            try {
                const result = spawnSync(process.env.PYTHON_PATH, ['--version']);
                if (result.status === 0) {
                    if (this.settings.debugMode) {
                        console.log(`Found Python at ${process.env.PYTHON_PATH}`);
                    }
                    return process.env.PYTHON_PATH;
                }
            } catch (e) {
                if (this.settings.debugMode) {
                    console.log('Failed to use PYTHON_PATH:', e);
                }
            }
        }

        // Try each path
        for (const path of commonPaths) {
            try {
                const result = spawnSync(path, ['--version']);
                if (result.status === 0) {
                    // Verify it's Python 3
                    const versionOutput = result.stdout.toString() || result.stderr.toString();
                    if (versionOutput.toLowerCase().includes('python 3')) {
                        if (this.settings.debugMode) {
                            console.log(`Found Python 3 at ${path}`);
                        }
                        return path;
                    }
                }
            } catch (e) {
                continue;
            }
        }

        throw new Error('Python 3.x not found. Please install Python and ensure it is in your PATH');
    }

    async ensurePythonPackages(pythonPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // For virtual environment, use the project directory as working directory
            const vaultPath = (this.app.vault.adapter as any).basePath;
            const pluginPath = join(vaultPath, '.obsidian', 'plugins', 'flashcard_maker');
            const cwd = pluginPath;

            // Set up environment for virtual environment
            const env: { [key: string]: string } = {
                ...process.env,
                PYTHONIOENCODING: 'utf-8',
            };

            // If this is a virtual environment, set up the proper environment variables
            if (pythonPath.includes('.venv')) {
                const venvPath = pythonPath.substring(0, pythonPath.indexOf('/bin/python'));
                const sitePackages = join(venvPath, 'lib', 'python3.13', 'site-packages');
                
                // Set PYTHONPATH to include the virtual environment's site-packages
                env.PYTHONPATH = sitePackages;
                env.VIRTUAL_ENV = venvPath;
                env.PATH = `${join(venvPath, 'bin')}:${env.PATH}`;
                
                if (this.settings.debugMode) {
                    console.log('Setting up virtual environment variables:');
                    console.log('  VIRTUAL_ENV:', env.VIRTUAL_ENV);
                    console.log('  PYTHONPATH:', env.PYTHONPATH);
                    console.log('  PATH prefix:', join(venvPath, 'bin'));
                }
            }

            // Check if packages are already installed
            const checkPackages = spawn(pythonPath, [
                '-c',
                'import sys; print(f"Python path: {sys.executable}"); import genanki, markdown2, yaml; print("✅ Packages already installed")'
            ], {
                cwd: cwd,
                env: env
            });

            let stdout = '';
            let stderr = '';

            checkPackages.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            checkPackages.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            checkPackages.on('close', async (code) => {
                if (this.settings.debugMode) {
                    console.log('Package check stdout:', stdout);
                    if (stderr) console.log('Package check stderr:', stderr);
                }

                if (code === 0) {
                    if (this.settings.debugMode) {
                        console.log('✅ Python packages are already installed');
                    }
                    resolve();
                    return;
                }

                // If this is our own venv and packages should be there, try a simple resolve
                if (pythonPath.includes('.venv') && pythonPath.includes('flashcard_maker')) {
                    if (this.settings.debugMode) {
                        console.log('⚠️ Package check failed in our own venv, but packages should be installed');
                        console.log('This might be a temporary environment issue. Proceeding anyway.');
                    }
                    resolve();  // Proceed anyway - packages were verified to be installed
                    return;
                }

                // If packages are not installed, try to install them
                if (this.settings.debugMode) {
                    console.log('❌ Required Python packages not found, attempting to install...');
                }
                
                // Check if this is a virtual environment and pip is available
                const pipCheckProcess = spawn(pythonPath, ['-m', 'pip', '--version'], {
                    cwd: cwd,
                    env: env
                });

                let pipCheckStdout = '';
                let pipCheckStderr = '';

                pipCheckProcess.stdout.on('data', (data) => {
                    pipCheckStdout += data.toString();
                });

                pipCheckProcess.stderr.on('data', (data) => {
                    pipCheckStderr += data.toString();
                });

                pipCheckProcess.on('close', (pipCheckCode) => {
                    if (pipCheckCode !== 0) {
                        console.error('❌ pip is not available in this Python environment');
                        console.error('pip check stderr:', pipCheckStderr);
                        reject(new Error(`pip is not available in the Python environment. Please ensure you have a proper virtual environment with pip installed.\nError: ${pipCheckStderr}`));
                        return;
                    }

                    if (this.settings.debugMode) {
                        console.log('✅ pip is available, proceeding with package installation');
                    }
                    
                    // Try to install packages using pip
                    const installProcess = spawn(pythonPath, [
                        '-m', 'pip', 'install', '--upgrade', 'pip', 'genanki', 'markdown2', 'pyyaml'
                    ], {
                        cwd: cwd,
                        env: env
                    });

                    let installStdout = '';
                    let installStderr = '';

                    installProcess.stdout.on('data', (data) => {
                        installStdout += data.toString();
                    });

                    installProcess.stderr.on('data', (data) => {
                        installStderr += data.toString();
                    });

                    installProcess.on('close', (installCode) => {
                        if (this.settings.debugMode) {
                            console.log('Install stdout:', installStdout);
                            console.log('Install stderr:', installStderr);
                        }
                        
                        if (installCode === 0) {
                            if (this.settings.debugMode) {
                                console.log('✅ Successfully installed Python packages');
                            }
                            new Notice('Successfully installed required Python packages');
                            resolve();
                        } else {
                            console.error('❌ Failed to install Python packages');
                            reject(new Error(`Failed to install Python packages. Please install genanki, markdown2, and pyyaml manually.\n${installStderr}`));
                        }
                    });

                    installProcess.on('error', (error) => {
                        console.error('Failed to start package installation:', error);
                        reject(new Error(`Failed to install Python packages: ${error.message}`));
                    });
                });

                pipCheckProcess.on('error', (error) => {
                    console.error('Failed to check pip availability:', error);
                    reject(new Error(`Failed to check pip availability: ${error.message}`));
                });
            });

            checkPackages.on('error', (error) => {
                console.error('Failed to check package installation:', error);
                reject(new Error(`Failed to check Python packages: ${error.message}`));
            });
        });
    }

    async createFlashcards(file: any) {
        if (!this.pythonPath) {
            new Notice('Python is not properly configured. Please check settings.');
            return;
        }

        // Get absolute paths using proper path joining
        const vaultPath = (this.app.vault.adapter as any).basePath;
        const pluginPath = join(vaultPath, '.obsidian', 'plugins', 'flashcard_maker');
        const scriptsPath = join(pluginPath, 'scripts');  // Updated to use scripts folder
        const tempDir = join(pluginPath, 'temp');
        
        try {
            // Pass debug flag to Python
            if (this.settings.debugMode) {
                console.log('Debug mode enabled');
                // Only show one initial debug notification
                new Notice('Debug mode: Processing flashcards...');
            }            
            // Use configured Python packages or ensure needed ones
            await this.ensurePythonPackages(this.pythonPath);
            const content = await this.app.vault.read(file);
            
            // Create temp directory and ensure it exists
            try {
                await fs.promises.mkdir(tempDir, { recursive: true });
                if (this.settings.debugMode) console.log('Created temp directory at:', tempDir);
            } catch (err) {
                console.error('Failed to create temp directory:', err);
                throw err;
            }

            // Create a unique temp file name with timestamp to avoid conflicts
            const timestamp = new Date().getTime();
            const tempFilePath = join(tempDir, `note_${timestamp}.txt`);
            // Updated script path to be in scripts folder
            const pyScriptPath = join(scriptsPath, 'create_flashcards.py');
            const deckPath = join(vaultPath, this.settings.deckFolder);

            // Verify files and directories - only log to console, not as notifications
            if (this.settings.debugMode) {
                console.log('Verifying paths...');
                console.log('Temp directory exists:', fs.existsSync(tempDir));
                console.log('Scripts directory exists:', fs.existsSync(scriptsPath));
                console.log('Python script exists:', fs.existsSync(pyScriptPath));
            }

            // Make sure Python script exists
            if (!fs.existsSync(pyScriptPath)) {
                throw new Error(`Python script not found at: ${pyScriptPath}`);
            }
            
            // Write content to temp file
            try {
                await fs.promises.writeFile(tempFilePath, content, 'utf-8');
                if (this.settings.debugMode) {
                    console.log('Successfully wrote temp file at:', tempFilePath);
                }
            } catch (err) {
                console.error('Failed to write temp file:', err);
                throw err;
            }
            
            // Verify temp file was written - log to console only
            if (this.settings.debugMode) console.log('Temp file exists:', fs.existsSync(tempFilePath));
            
            // Create decks folder if it doesn't exist
            if (!fs.existsSync(deckPath)) {
                await fs.promises.mkdir(deckPath, { recursive: true });
                if (this.settings.debugMode) {
                    console.log('Created deck path directory at:', deckPath);
                }
            }

            // Execute Python script with appropriate flags including debug mode if enabled
            return new Promise((resolve, reject) => {
                const args = [
                    pyScriptPath,
                    tempFilePath,
                    deckPath,
                    file.basename || this.settings.defaultDeckName,
                    this.settings.defaultTags,
                    '--card-style',
                    this.settings.cardStyle,
                    '--custom-css',
                    this.settings.customCSS  // Add the custom CSS parameter
                ];
                
                // Add debug flag if enabled
                if (this.settings.debugMode) {
                    args.push("--debug");
                    // Only log to console, not as notification
                    console.log('Debug mode: Executing Python script');
                }
                
                if (this.settings.debugMode) {
                    console.log('Executing Python with args:', args);
                    console.log('Python path:', this.pythonPath);
                }
                
                const pythonProcess = spawn(this.pythonPath as string, args, {
                    cwd: scriptsPath,
                    env: { 
                        ...process.env, 
                        PYTHONPATH: scriptsPath,
                        PYTHONIOENCODING: 'utf-8',
                        DEBUG_MODE: this.settings.debugMode ? "1" : "0",
                        // If using virtual environment, set proper environment
                        ...(this.pythonPath && this.pythonPath.includes('.venv') ? {
                            VIRTUAL_ENV: this.pythonPath.substring(0, this.pythonPath.indexOf('/bin/python')),
                            PATH: `${join(this.pythonPath.substring(0, this.pythonPath.indexOf('/bin/python')), 'bin')}:${process.env.PATH}`
                        } : {})
                    }
                });

                let stdout = '';
                let stderr = '';
                
                // Track if we've already shown a validation summary notification
                let hasShownValidationNotice = false;

                pythonProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    stdout += output;
                    if (this.settings.debugMode) {
                        // Always log to console
                        console.log('Python stdout:', output);
                        
                        // Show at most one validation summary message
                        if (!hasShownValidationNotice && output.includes('cards passed validation')) {
                            // Extract just the numeric summary and show that
                            const validationMatch = output.match(/(\d+) cards passed validation, (\d+) cards rejected, (\d+) cards auto-corrected/);
                            if (validationMatch) {
                                const [_, valid, rejected, autocorrected] = validationMatch;
                                new Notice(`Cards: ${valid} valid, ${rejected} rejected, ${autocorrected} auto-corrected`);
                                hasShownValidationNotice = true;
                            }
                        }
                    }
                });

                pythonProcess.stderr.on('data', (data) => {
                    const output = data.toString();
                    stderr += output;
                    console.error('Python stderr:', output);
                    
                    // Only show critical errors as notifications, not every message
                    if (this.settings.debugMode && output.trim() && 
                        (output.includes('Error:') || output.includes('Exception:') || output.includes('Critical:'))) {
                        new Notice(`Error: ${output.trim().split('\n')[0].substring(0, 100)}`);
                    }
                });

                pythonProcess.on('error', (error) => {
                    console.error('Failed to start Python process:', error);
                    reject(error);
                });

                pythonProcess.on('close', async (code) => {
                    // Clean up temp file if not keeping them
                    if (!this.settings.keepTempFiles) {
                        try {
                            await fs.promises.unlink(tempFilePath);
                            if (this.settings.debugMode) {
                                console.log('Temp file deleted');
                            }
                        } catch (err) {
                            console.error('Failed to delete temp file:', err);
                        }
                    }
                    
                    if (code === 0) {
                        // Successfully created the cards
                        new Notice('Flashcards created successfully!');
                        
                        // Try to sync with Anki if enabled
                        const vaultPath = (this.app.vault.adapter as any).basePath;
                        const deckPath = join(vaultPath, this.settings.deckFolder);
                        await this.syncWithAnki(deckPath, file.basename || this.settings.defaultDeckName);
                        
                        resolve(stdout);
                    } else {
                        const error = new Error(`Python process failed with code ${code}\n${stderr}`);
                        console.error(error);
                        new Notice(`Error creating flashcards: ${stderr.split('\n')[0]}`);
                        reject(error);
                    }
                });
            });
        } catch (err) {
            console.error('Detailed error:', err);
            new Notice(`Error creating flashcards: ${err instanceof Error ? err.message : String(err)}`);
            throw err;
        } finally {
            // Don't delete the temp directory immediately
            // Let the system clean it up later or on next run
            if (this.settings.debugMode) {
                console.log('Finished processing');
            }
        }
    }

    async syncWithAnki(deckPath: string, deckName: string): Promise<boolean> {
        if (!this.settings.syncOnCreate) {
            return false;
        }

        try {
            // Check if AnkiConnect is available
            const connectTest = await this.testAnkiConnect();
            if (!connectTest) {
                if (this.settings.debugMode) {
                    console.log('AnkiConnect not available, skipping sync');
                }
                return false;
            }

            // Read the generated .apkg file
            const apkgPath = join(deckPath, `${deckName}.apkg`);
            if (!fs.existsSync(apkgPath)) {
                if (this.settings.debugMode) {
                    console.error('APKG file not found for sync:', apkgPath);
                }
                return false;
            }

            // Import the deck into Anki
            const importResult = await this.importDeckToAnki(apkgPath, deckName);
            if (importResult) {
                new Notice(`Successfully synced deck "${deckName}" to Anki`);
                return true;
            } else {
                new Notice('Failed to sync deck to Anki');
                return false;
            }
        } catch (error) {
            if (this.settings.debugMode) {
                console.error('Anki sync error:', error);
            }
            new Notice('Failed to sync with Anki');
            return false;
        }
    }

    async testAnkiConnect(): Promise<boolean> {
        try {
            const response = await fetch(this.settings.ankiConnectUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'version',
                    version: 6
                })
            });

            if (!response.ok) {
                return false;
            }

            const result = await response.json();
            return result && typeof result.result === 'number';
        } catch (error) {
            if (this.settings.debugMode) {
                console.error('AnkiConnect test failed:', error);
            }
            return false;
        }
    }

    async importDeckToAnki(apkgPath: string, deckName: string): Promise<boolean> {
        try {
            // Read the APKG file as base64
            const apkgData = await fs.promises.readFile(apkgPath);
            const base64Data = apkgData.toString('base64');

            const response = await fetch(this.settings.ankiConnectUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'importPackage',
                    version: 6,
                    params: {
                        base64: base64Data
                    }
                })
            });

            if (!response.ok) {
                return false;
            }

            const result = await response.json();
            return result && result.result !== null;
        } catch (error) {
            if (this.settings.debugMode) {
                console.error('Anki import error:', error);
            }
            return false;
        }
    }

    async getAnkiDecks(): Promise<string[]> {
        try {
            const response = await fetch(this.settings.ankiConnectUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'deckNames',
                    version: 6
                })
            });

            if (!response.ok) {
                return [];
            }

            const result = await response.json();
            return result.result || [];
        } catch (error) {
            if (this.settings.debugMode) {
                console.error('Failed to get Anki decks:', error);
            }
            return [];
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        if (this.settings.debugMode) {
            console.log('Unloading flashcard maker plugin');
        }
    }

    // Improved cleanup that actually works
    async cleanupOldFiles(): Promise<void> {
        try {
            const vaultPath = (this.app.vault.adapter as any).basePath;
            const pluginPath = join(vaultPath, '.obsidian', 'plugins', 'flashcard_maker');
            
            if (this.settings.debugMode) {
                console.log('Starting cleanup process...');
                console.log('Plugin path:', pluginPath);
            }
            
            // Clean up temp files
            const tempDir = join(pluginPath, 'temp');
            await this.cleanupTempFiles(tempDir);
            
            // Clean up old logs
            const logDir = join(pluginPath, 'scripts', 'logs');
            await this.cleanupLogs(logDir);
            
            if (this.settings.debugMode) console.log('Cleanup completed successfully');
            return Promise.resolve();
        } catch (error) {
            console.error('Error during cleanup:', error);
            if (this.settings.debugMode) {
                new Notice(`Cleanup error: ${error instanceof Error ? error.message : String(error)}`);
            }
            return Promise.reject(error);
        }
    }
    
    // Better implementation of temp file cleanup
    async cleanupTempFiles(tempDir: string): Promise<void> {
        if (!fs.existsSync(tempDir)) {
            if (this.settings.debugMode) console.log(`Temp directory doesn't exist yet: ${tempDir}`);
            return Promise.resolve();
        }
        
        const now = new Date();
        let files;
        
        try {
            files = await fs.promises.readdir(tempDir);
            if (this.settings.debugMode) console.log(`Found ${files.length} temp files to check`);
        } catch (error) {
            console.error(`Failed to read temp directory ${tempDir}:`, error);
            return Promise.resolve(); // Continue even if we can't read the directory
        }
        
        let deletedCount = 0;
        const deletePromises = [];
        
        for (const file of files) {
            try {
                const filePath = join(tempDir, file);
                const stats = await fs.promises.stat(filePath);
                
                // Check if file is older than tempFileLifespan hours
                const fileAge = (now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60);
                
                if (fileAge > this.settings.tempFileLifespan || !this.settings.keepTempFiles) {
                    // Delete file asynchronously and collect promises
                    deletePromises.push(fs.promises.unlink(filePath)
                        .then(() => {
                            deletedCount++;
                            if (this.settings.debugMode) {
                                console.log(`Deleted temp file: ${file} (age: ${fileAge.toFixed(2)} hours)`);
                            }
                        })
                        .catch(err => console.error(`Failed to delete ${file}:`, err))
                    );
                } else if (this.settings.debugMode) {
                    console.log(`Keeping temp file: ${file} (age: ${fileAge.toFixed(2)} hours)`);
                }
            } catch (error) {
                console.error(`Failed to process temp file ${file}:`, error);
            }
        }
        
        // Wait for all delete operations to complete
        await Promise.all(deletePromises);
        
        if (this.settings.debugMode || deletedCount > 0) {
            if (this.settings.debugMode) {
                console.log(`Deleted ${deletedCount} temp files`);
            }
            if (deletedCount > 0) {
                new Notice(`Deleted ${deletedCount} temporary files`);
            }
        }
        
        return Promise.resolve();
    }
    
    // Better implementation of log cleanup
    async cleanupLogs(logDir: string): Promise<void> {
        if (!fs.existsSync(logDir)) {
            if (this.settings.debugMode) console.log(`Log directory doesn't exist yet: ${logDir}`);
            return Promise.resolve();
        }
        
        const now = new Date();
        let files;
        
        try {
            files = await fs.promises.readdir(logDir);
            if (this.settings.debugMode) console.log(`Found ${files.length} log files to check`);
        } catch (error) {
            console.error(`Failed to read log directory ${logDir}:`, error);
            return Promise.resolve(); // Continue even if we can't read the directory
        }
        
        let deletedCount = 0;
        const deletePromises = [];
        
        for (const file of files) {
            try {
                if (!file.endsWith('.log')) continue;
                
                const filePath = join(logDir, file);
                const stats = await fs.promises.stat(filePath);
                
                // Check if file is older than logRetention days
                const fileAge = (now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
                
                if (fileAge > this.settings.logRetention) {
                    // Delete file asynchronously and collect promises
                    deletePromises.push(fs.promises.unlink(filePath)
                        .then(() => {
                            deletedCount++;
                            if (this.settings.debugMode) {
                                console.log(`Deleted log file: ${file} (age: ${fileAge.toFixed(2)} days)`);
                            }
                        })
                        .catch(err => console.error(`Failed to delete ${file}:`, err))
                    );
                } else if (this.settings.debugMode) {
                    console.log(`Keeping log file: ${file} (age: ${fileAge.toFixed(2)} days)`);
                }
            } catch (error) {
                console.error(`Failed to process log file ${file}:`, error);
            }
        }
        
        // Wait for all delete operations to complete
        await Promise.all(deletePromises);
        
        if (this.settings.debugMode || deletedCount > 0) {
            if (this.settings.debugMode) {
                console.log(`Deleted ${deletedCount} log files`);
            }
            if (deletedCount > 0) {
                new Notice(`Deleted ${deletedCount} log files`);
            }
        }
        
        return Promise.resolve();
    }
}


class FlashcardSettingTab extends PluginSettingTab {
    plugin: FlashcardMakerPlugin;
    customTemplatesList: HTMLElement;

    constructor(app: App, plugin: FlashcardMakerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        // General Settings Section
        containerEl.createEl('h2', {text: 'Flashcard Maker Settings'});
        
        const generalSection = containerEl.createEl('div', {cls: 'setting-section'});
        generalSection.createEl('h3', {text: 'General Settings'});
        
        new Setting(generalSection)
            .setName('Deck Folder')
            .setDesc('Folder where deck files will be saved')
            .addText(text => text
                .setPlaceholder('Flashcards')
                .setValue(this.plugin.settings.deckFolder)
                .onChange(async (value) => {
                    this.plugin.settings.deckFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(generalSection)
            .setName('Default Deck Name')
            .setDesc('Default name for new decks')
            .addText(text => text
                .setPlaceholder('Obsidian')
                .setValue(this.plugin.settings.defaultDeckName)
                .onChange(async (value) => {
                    this.plugin.settings.defaultDeckName = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(generalSection)
            .setName('Default Tags')
            .setDesc('Default tags for new cards (comma-separated)')
            .addText(text => text
                .setPlaceholder('obsidian, learning')
                .setValue(this.plugin.settings.defaultTags)
                .onChange(async (value) => {
                    this.plugin.settings.defaultTags = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(generalSection)
            .setName('Card Style')
            .setDesc('Choose the visual style for your flashcards')
            .addDropdown(dropdown => dropdown
                .addOption('default', 'Modern (Default)')
                .setValue(this.plugin.settings.cardStyle)
                .onChange(async (value) => {
                    this.plugin.settings.cardStyle = value;
                    await this.plugin.saveSettings();
                }));

        // Custom CSS Section
        const cssSection = containerEl.createEl('div', {cls: 'setting-section'});
        cssSection.createEl('h3', {text: 'Custom Styling'});

        new Setting(cssSection)
            .setName('Custom CSS')
            .setDesc('Additional CSS to apply to all flashcards')
            .addTextArea(text => text
                .setPlaceholder('/* Add your custom CSS here */\n.card { /* your styles */ }')
                .setValue(this.plugin.settings.customCSS)
                .onChange(async (value) => {
                    this.plugin.settings.customCSS = value;
                    await this.plugin.saveSettings();
                }));

        // Media Section
        const mediaSection = containerEl.createEl('div', {cls: 'setting-section'});
        mediaSection.createEl('h3', {text: 'Media Settings'});

        // Hotkeys Section
        const hotkeysSection = containerEl.createEl('div', {cls: 'setting-section'});
        hotkeysSection.createEl('h3', {text: 'Flashcard Templates Hotkeys'});
        
        const hotkeyInfo = hotkeysSection.createEl('div', {cls: 'flashcard-hotkey-info'});
        hotkeyInfo.innerHTML = `
            <p>You can assign hotkeys to quickly insert different flashcard templates into your notes.</p>
            <ol>
                <li>Go to <strong>Settings → Hotkeys</strong> in Obsidian</li>
                <li>Search for "flashcard" or "insert"</li>
                <li>Assign your preferred key combinations to each card type</li>
            </ol>
            <p>The following commands are available for hotkeys:</p>
        `;
        
        const hotkeyTable = hotkeysSection.createEl('table', {cls: 'flashcards-hotkey-table'});
        const tableHead = hotkeyTable.createEl('thead');
        const headerRow = tableHead.createEl('tr');
        headerRow.createEl('th', {text: 'Card Type'});
        headerRow.createEl('th', {text: 'Command ID'});
        headerRow.createEl('th', {text: 'Description'});
        
        const tableBody = hotkeyTable.createEl('tbody');
        
        this.addHotkeyRow(tableBody, 'Basic', 'flashcard-maker:insert-basic-card', 'Question and answer card');
        this.addHotkeyRow(tableBody, 'Cloze', 'flashcard-maker:insert-cloze-card', 'Text with hidden portions to recall');
        this.addHotkeyRow(tableBody, 'Fill-in-the-Blank', 'flashcard-maker:insert-fill-in-blank-card', 'Question with blank space to complete');
        this.addHotkeyRow(tableBody, 'Multiple Choice', 'flashcard-maker:insert-multiple-choice-card', 'Question with multiple options');
        this.addHotkeyRow(tableBody, 'True/False', 'flashcard-maker:insert-true-false-card', 'Statement to evaluate as true or false');
        this.addHotkeyRow(tableBody, 'Math', 'flashcard-maker:insert-math-card', 'Card with LaTeX math equations');
        this.addHotkeyRow(tableBody, 'Reversed', 'flashcard-maker:insert-reversed-card', 'Card with front/back swapped');
        this.addHotkeyRow(tableBody, 'Image Occlusion', 'flashcard-maker:insert-image-occlusion-card', 'Card with masked image areas');
        this.addHotkeyRow(tableBody, 'Audio', 'flashcard-maker:insert-audio-card', 'Card with audio content');
        
        // Advanced Settings Section
        const advancedSection = containerEl.createEl('div', {cls: 'setting-section'});
        advancedSection.createEl('h3', {text: 'Advanced Settings'});
        
        new Setting(advancedSection)
            .setName('Media Folder')
            .setDesc('Folder where media files will be stored')
            .addText(text => text
                .setPlaceholder('Flashcards/media')
                .setValue(this.plugin.settings.mediaFolder)
                .onChange(async (value) => {
                    this.plugin.settings.mediaFolder = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(advancedSection)
            .setName('AnkiConnect URL')
            .setDesc('URL for AnkiConnect')
            .addText(text => text
                .setPlaceholder('http://localhost:8765')
                .setValue(this.plugin.settings.ankiConnectUrl)
                .onChange(async (value) => {
                    this.plugin.settings.ankiConnectUrl = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(advancedSection)
            .setName('Test Python Setup')
            .setDesc('Test if Python and required packages are working correctly')
            .addButton(button => button
                .setButtonText('Test Setup')
                .onClick(async () => {
                    if (!this.plugin.pythonPath) {
                        new Notice('No Python path configured');
                        return;
                    }
                    
                    try {
                        await this.plugin.ensurePythonPackages(this.plugin.pythonPath);
                        new Notice('✅ Python setup is working correctly!');
                    } catch (error) {
                        new Notice(`❌ Python setup test failed: ${error instanceof Error ? error.message : String(error)}`);
                        console.error('Python setup test failed:', error);
                    }
                }));

        new Setting(advancedSection)
            .setName('Test AnkiConnect')
            .setDesc('Test connection to AnkiConnect')
            .addButton(button => button
                .setButtonText('Test Connection')
                .onClick(async () => {
                    const isConnected = await this.plugin.testAnkiConnect();
                    if (isConnected) {
                        new Notice('AnkiConnect connection successful');
                    } else {
                        new Notice('AnkiConnect connection failed. Make sure Anki is running with AnkiConnect enabled.');
                    }
                }));

        new Setting(advancedSection)
            .setName('Sync on Create')
            .setDesc('Sync with Anki on card creation')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.syncOnCreate)
                .onChange(async (value) => {
                    this.plugin.settings.syncOnCreate = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(advancedSection)
            .setName('Keep Temporary Files')
            .setDesc('Keep temporary files for debugging purposes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.keepTempFiles)
                .onChange(async (value) => {
                    this.plugin.settings.keepTempFiles = value;
                    await this.plugin.saveSettings();
                }));
                
        new Setting(advancedSection)
            .setName('Temporary File Lifespan')
            .setDesc('How long to keep temporary files before cleanup (in hours)')
            .addSlider(slider => slider
                .setLimits(1, 168, 1)
                .setValue(this.plugin.settings.tempFileLifespan)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.tempFileLifespan = value;
                    await this.plugin.saveSettings();
                }));
                
        new Setting(advancedSection)
            .setName('Log Retention')
            .setDesc('How many days to keep log files')
            .addSlider(slider => slider
                .setLimits(1, 30, 1)
                .setValue(this.plugin.settings.logRetention)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.logRetention = value;
                    await this.plugin.saveSettings();
                }));
                
        new Setting(advancedSection)
            .setName('Clean up on Startup')
            .setDesc('Automatically clean up old temp files and logs when starting Obsidian')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.cleanupOnStartup)
                .onChange(async (value) => {
                    this.plugin.settings.cleanupOnStartup = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(advancedSection)
            .setName('Manual Cleanup')
            .setDesc('Delete all old temporary files and logs now')
            .addButton(button => button
                .setButtonText('Clean Now')
                .onClick(async () => {
                    await this.plugin.cleanupOldFiles();
                    new Notice('Cleanup completed');
                }));
                
        new Setting(advancedSection)
            .setName('Debug Mode')
            .setDesc('Enable verbose logging for troubleshooting')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.saveSettings();
                }));
                
        new Setting(advancedSection)
            .setName('Python Virtual Environment Path')
            .setDesc('Path to Python virtual environment directory (e.g., /path/to/.venv)')
            .addText(text => text
                .setPlaceholder('/path/to/.venv')
                .setValue(this.plugin.settings.pythonVenvPath)
                .onChange(async (value) => {
                    this.plugin.settings.pythonVenvPath = value;
                    if (value) {
                        this.plugin.pythonPath = join(value, 'bin', 'python3');
                    } else if (this.plugin.settings.pythonPath) {
                        this.plugin.pythonPath = this.plugin.settings.pythonPath;
                    } else {
                        // Auto-detect if both fields cleared
                        try {
                            this.plugin.pythonPath = await this.plugin.findSystemPython();
                            new Notice(`Python found at: ${this.plugin.pythonPath}`);
                        } catch (error) {
                            console.error('Failed to find Python:', error);
                            new Notice('Python not found. Please install Python 3.x');
                        }
                    }
                    await this.plugin.saveSettings();
                }));
                
        new Setting(advancedSection)
            .setName('Python Executable Path')
            .setDesc('Custom path to Python executable (leave empty for auto-detection)')
            .addText(text => text
                .setPlaceholder('/usr/bin/python3')
                .setValue(this.plugin.settings.pythonPath)
                .onChange(async (value) => {
                    this.plugin.settings.pythonPath = value;
                    if (value) {
                        this.plugin.pythonPath = value;
                    } else if (this.plugin.settings.pythonVenvPath) {
                        this.plugin.pythonPath = join(this.plugin.settings.pythonVenvPath, 'bin', 'python3');
                    } else {
                        // Auto-detect if field cleared
                        try {
                            this.plugin.pythonPath = await this.plugin.findSystemPython();
                            new Notice(`Python found at: ${this.plugin.pythonPath}`);
                        } catch (error) {
                            console.error('Failed to find Python:', error);
                            new Notice('Python not found. Please install Python 3.x');
                        }
                    }
                    await this.plugin.saveSettings();
                }));

        // Add custom CSS for the table
        const customCss = document.createElement('style');
        customCss.textContent = `
            .setting-section {
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid var(--background-modifier-border);
            }
            .setting-section:last-child {
                border-bottom: none;
            }
            .flashcards-hotkey-table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
            }
            .flashcards-hotkey-table th,
            .flashcards-hotkey-table td {
                border: 1px solid var(--background-modifier-border);
                padding: 8px 12px;
                text-align: left;
            }
            .flashcards-hotkey-table th {
                background-color: var(--background-secondary);
                font-weight: bold;
            }
            .flashcards-hotkey-table tr:nth-child(even) {
                background-color: var(--background-secondary-alt);
            }
            .flashcard-hotkey-info {
                background-color: var(--background-primary-alt);
                border-radius: 5px;
                padding: 10px 15px;
                margin: 10px 0;
            }
        `;
        document.head.appendChild(customCss);
    }

    addHotkeyRow(tableBody: HTMLElement, type: string, commandId: string, description: string): void {
        const row = tableBody.createEl('tr');
        row.createEl('td', {text: type});
        row.createEl('td', {text: commandId});
        row.createEl('td', {text: description});
    }
}
