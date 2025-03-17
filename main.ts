import { App, Notice, Plugin, PluginSettingTab, Setting, Modal, MarkdownRenderer } from 'obsidian';
import { spawn, spawnSync } from 'child_process';
import { join, dirname } from 'path';
import * as fs from 'fs';

interface FlashcardSettings {
    // Basic settings
    deckFolder: string;
    defaultDeckName: string;
    defaultTags: string;
    

    // Advanced styling
    customCSS: string; // Additional CSS to apply to all cards
    cardStyle: string; // Add this line
    
    // Media settings
    mediaFolder: string; // Where to store media files
    enableAudioRecording: boolean; // Whether to enable audio recording
    
    // Anki sync settings
    ankiConnectUrl: string; // URL for AnkiConnect
    syncOnCreate: boolean; // Whether to sync with Anki on creation
    
    // File management settings
    keepTempFiles: boolean;
    tempFileLifespan: number; // in hours
    logRetention: number; // in days
    
    // Advanced settings
    debugMode: boolean;
    pythonPath: string;
    cleanupOnStartup: boolean;
    
    // Card behavior settings
    addSourceLink: boolean; // Add link back to source note
    addCreationDate: boolean; // Add creation timestamp
    addTags: boolean; // Include tags from the note
}

const DEFAULT_SETTINGS: FlashcardSettings = {
    // Basic settings
    deckFolder: 'Flashcards',
    defaultDeckName: 'Obsidian',
    defaultTags: 'obsidian',
    
    
    // Advanced styling
    customCSS: '',
    cardStyle: 'default',  // Add this line
    
    // Media settings
    mediaFolder: 'Flashcards/media',
    enableAudioRecording: false,
    
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
    cleanupOnStartup: true,
    
    // Card behavior settings
    addSourceLink: true,
    addCreationDate: true,
    addTags: true
}



export default class FlashcardMakerPlugin extends Plugin {
    settings: FlashcardSettings;
    pythonPath: string | null = null;

    async onload() {
        await this.loadSettings();
        
        // Set up the Python path from settings if available
        if (this.settings.pythonPath) {
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
                console.log('Python packages installed successfully');
            }
        } catch (error) {
            console.error('Failed to install Python packages:', error);
            new Notice('Failed to install required Python packages. Please check your internet connection and Python installation.');
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
        
        

        // Initialize Python path
        try {
            this.pythonPath = await this.findSystemPython();
        } catch (error) {
            console.error('Failed to find Python:', error);
            new Notice('Python not found. Please install Python 3.x');
        }
    }

    async findSystemPython(): Promise<string> {
        // Check common Python paths first
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
                    console.log(`Found Python at ${process.env.PYTHON_PATH}`);
                    return process.env.PYTHON_PATH;
                }
            } catch (e) {
                console.log('Failed to use PYTHON_PATH:', e);
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
                        console.log(`Found Python 3 at ${path}`);
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
            const pip = spawn(pythonPath, [
                '-m',
                'pip',
                'install',
                '--user',
                'genanki',
                'markdown2'
            ]);

            pip.stdout.on('data', (data) => {
                console.log('pip stdout:', data.toString());
            });

            pip.stderr.on('data', (data) => {
                console.error('pip stderr:', data.toString());
            });

            pip.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Failed to install Python packages (exit code: ${code})`));
                }
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

            // Verify files and directories
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
                if (this.settings.debugMode) console.log('Successfully wrote temp file at:', tempFilePath);
            } catch (err) {
                console.error('Failed to write temp file:', err);
                throw err;
            }
            
            // Verify temp file was written
            if (this.settings.debugMode) console.log('Temp file exists:', fs.existsSync(tempFilePath));
            
            // Create decks folder if it doesn't exist
            if (!fs.existsSync(deckPath)) {
                await fs.promises.mkdir(deckPath, { recursive: true });
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
                    this.settings.cardStyle  // Add the card style parameter
                ];
                
                // Add debug flag if enabled
                if (this.settings.debugMode) {
                    args.push("--debug");
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
                        DEBUG_MODE: this.settings.debugMode ? "1" : "0"
                    }
                });

                let stdout = '';
                let stderr = '';

                pythonProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    stdout += output;
                    if (this.settings.debugMode) console.log('Python stdout:', output);
                });

                pythonProcess.stderr.on('data', (data) => {
                    const output = data.toString();
                    stderr += output;
                    console.error('Python stderr:', output);
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
                            if (this.settings.debugMode) console.log('Temp file deleted');
                        } catch (err) {
                            console.error('Failed to delete temp file:', err);
                        }
                    }
                    
                    if (code === 0) {
                        new Notice('Flashcards created successfully!');
                        resolve(stdout);
                    } else {
                        const error = new Error(`Python process failed with code ${code}\n${stderr}`);
                        console.error(error);
                        new Notice(`Error creating flashcards: ${stderr}`);
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
            if (this.settings.debugMode) console.log('Finished processing');
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        console.log('Unloading flashcard maker plugin');
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
            console.log(`Deleted ${deletedCount} temp files`);
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
            console.log(`Deleted ${deletedCount} log files`);
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

        // Create tabs for better organization
        const tabsEl = containerEl.createEl('div', {cls: 'settings-tabs'});
        const tabContentsEl = tabsEl.createEl('div', {cls: 'settings-tab-contents'});
        

        // Create tab contents
        const generalTabContent = tabContentsEl.createEl('div', {cls: 'settings-tab-content active'});
        const advancedTabContent = tabContentsEl.createEl('div', {cls: 'settings-tab-content'});
        


        // General Settings Section
        generalTabContent.createEl('h3', {text: 'General Settings'});
        
        new Setting(generalTabContent)
            .setName('Deck Folder')
            .setDesc('Folder where deck files will be saved')
            .addText(text => text
                .setPlaceholder('Flashcards')
                .setValue(this.plugin.settings.deckFolder)
                .onChange(async (value) => {
                    this.plugin.settings.deckFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(generalTabContent)
            .setName('Default Deck Name')
            .setDesc('Default name for new decks')
            .addText(text => text
                .setPlaceholder('Obsidian')
                .setValue(this.plugin.settings.defaultDeckName)
                .onChange(async (value) => {
                    this.plugin.settings.defaultDeckName = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(generalTabContent)
            .setName('Default Tags')
            .setDesc('Default tags for new cards (comma-separated)')
            .addText(text => text
                .setPlaceholder('obsidian, learning')
                .setValue(this.plugin.settings.defaultTags)
                .onChange(async (value) => {
                    this.plugin.settings.defaultTags = value;
                    await this.plugin.saveSettings();
                }));
        
        // Add this setting before the Custom CSS setting
        new Setting(generalTabContent)
            .setName('Card Style')
            .setDesc('Choose the visual style for your flashcards')
            .addDropdown(dropdown => dropdown
                .addOption('default', 'Modern (Default)')
                .addOption('retro', 'Retro')
                .addOption('minimal', 'Minimal')
                .addOption('bauhaus', 'Bauhaus')
                .addOption('brutalist', 'Brutalist')
                .addOption('contemporary', 'Contemporary')
                .addOption('colorful', 'Colorful')
                .setValue(this.plugin.settings.cardStyle)
                .onChange(async (value) => {
                    this.plugin.settings.cardStyle = value;
                    await this.plugin.saveSettings();
                }));

        // Advanced Settings Section
        advancedTabContent.createEl('h3', {text: 'Advanced Settings'});
        
        new Setting(advancedTabContent)
            .setName('Custom CSS')
            .setDesc('Add custom CSS to style your cards')
            .addTextArea(textArea => textArea
                .setPlaceholder('/* Your custom CSS here */')
                .setValue(this.plugin.settings.customCSS)
                .onChange(async (value) => {
                    this.plugin.settings.customCSS = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(advancedTabContent)
            .setName('Media Folder')
            .setDesc('Folder where media files will be stored')
            .addText(text => text
                .setPlaceholder('Flashcards/media')
                .setValue(this.plugin.settings.mediaFolder)
                .onChange(async (value) => {
                    this.plugin.settings.mediaFolder = value;
                    await this.plugin.saveSettings();
                }));
        
        
        new Setting(advancedTabContent)
            .setName('AnkiConnect URL')
            .setDesc('URL for AnkiConnect')
            .addText(text => text
                .setPlaceholder('http://localhost:8765')
                .setValue(this.plugin.settings.ankiConnectUrl)
                .onChange(async (value) => {
                    this.plugin.settings.ankiConnectUrl = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(advancedTabContent)
            .setName('Sync on Create')
            .setDesc('Sync with Anki on card creation')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.syncOnCreate)
                .onChange(async (value) => {
                    this.plugin.settings.syncOnCreate = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(advancedTabContent)
            .setName('Keep Temporary Files')
            .setDesc('Keep temporary files for debugging purposes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.keepTempFiles)
                .onChange(async (value) => {
                    this.plugin.settings.keepTempFiles = value;
                    await this.plugin.saveSettings();
                }));
                
        new Setting(advancedTabContent)
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
                
        new Setting(advancedTabContent)
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
                
        new Setting(advancedTabContent)
            .setName('Clean up on Startup')
            .setDesc('Automatically clean up old temp files and logs when starting Obsidian')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.cleanupOnStartup)
                .onChange(async (value) => {
                    this.plugin.settings.cleanupOnStartup = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(advancedTabContent)
            .setName('Manual Cleanup')
            .setDesc('Delete all old temporary files and logs now')
            .addButton(button => button
                .setButtonText('Clean Now')
                .onClick(async () => {
                    await this.plugin.cleanupOldFiles();
                    new Notice('Cleanup completed');
                }));
                
        new Setting(advancedTabContent)
            .setName('Debug Mode')
            .setDesc('Enable verbose logging for troubleshooting')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.saveSettings();
                }));
                
        new Setting(advancedTabContent)
            .setName('Python Path')
            .setDesc('Custom path to Python executable (leave empty for auto-detection)')
            .addText(text => text
                .setPlaceholder('/usr/bin/python3')
                .setValue(this.plugin.settings.pythonPath)
                .onChange(async (value) => {
                    this.plugin.settings.pythonPath = value;
                    if (value) {
                        this.plugin.pythonPath = value;
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
    }

    switchTab(headerEl: HTMLElement, contentEl: HTMLElement) {
        // Deactivate all tab headers and contents
        const headers = this.containerEl.querySelectorAll('.settings-tab-header');
        const contents = this.containerEl.querySelectorAll('.settings-tab-content');
        headers.forEach(header => header.classList.remove('active'));
        contents.forEach(content => content.classList.remove('active'));
        
        // Activate the selected tab
        headerEl.classList.add('active');
        contentEl.classList.add('active');
    }

}
