import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

// Define the vault path - change this to your vault's path
const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH || '/home/sapiens/Second Brain/';

const PLUGIN_DIR = join(VAULT_PATH, '.obsidian', 'plugins', 'neuralcard');

// Check if vault exists
if (!existsSync(VAULT_PATH)) {
    console.error(`Vault path does not exist: ${VAULT_PATH}`);
    console.error('Set OBSIDIAN_VAULT_PATH environment variable or edit this script.');
    process.exit(1);
}

// Create plugin directory if it doesn't exist
execSync(`mkdir -p "${PLUGIN_DIR}"`, { stdio: 'inherit' });

// Copy files
const filesToCopy = ['main.js', 'manifest.json'];
filesToCopy.forEach(file => {
    if (existsSync(file)) {
        execSync(`cp "${file}" "${PLUGIN_DIR}/"`, { stdio: 'inherit' });
        console.log(`Copied ${file} to ${PLUGIN_DIR}`);
    } else {
        console.warn(`${file} not found, skipping.`);
    }
});

console.log('Plugin deployed successfully! Reload Obsidian to see changes.');
