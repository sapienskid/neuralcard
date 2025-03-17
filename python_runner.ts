import { spawn } from 'child_process';
import { join } from 'path';

export async function generateFlashcards(text: string, pythonPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // Dynamically construct the path to the Python script
        const scriptPath = join(__dirname, 'scripts/generate_flashcards.py');

        const pythonProcess = spawn(pythonPath, [scriptPath, text]);

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python script failed with code ${code}: ${errorOutput}`);
                reject(`Flashcard generation failed. Python script error (code ${code}): ${errorOutput}`); // Include error output
            } else {
                try {
                    // Parse the JSON output
                    const flashcards = JSON.parse(output);
                    resolve(JSON.stringify(flashcards, null, 2)); // Stringify with indentation for readability
                } catch (e) {
                    console.error('Failed to parse JSON output from Python script', e);
                    reject('Failed to parse JSON output from Python script.');
                }
            }
        });

        pythonProcess.on('error', (err) => {
            console.error('Failed to start subprocess.', err);
            reject('Failed to start Python subprocess. Is Python installed and in your PATH?');
        });
    });
}
