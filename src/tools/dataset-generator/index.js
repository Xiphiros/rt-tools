import { glob } from 'glob';
import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';
import os from 'os';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script is in: src/tools/dataset-generator
// Root is:      ../../../
const SONGS_DIR = path.resolve(__dirname, '../../../songs');
const OUTPUT_FILE = path.resolve(__dirname, '../../web/public/beatmaps.json');
const WORKER_PATH = path.join(__dirname, 'worker.js');

async function main() {
    console.log(chalk.cyan(`🔍 Scanning for .rtm files in: ${SONGS_DIR}`));
    
    // Find all map files
    const searchPattern = `${SONGS_DIR}/**/*.rtm`.replace(/\\/g, '/');
    const files = await glob(searchPattern);

    if (files.length === 0) {
        console.warn(chalk.yellow(`No beatmaps found in ${SONGS_DIR}.`));
        return;
    } 

    console.log(chalk.blue(`Found ${files.length} beatmaps.`));
    
    // Setup Thread Pool
    const numCPUs = os.cpus().length;
    // Leave one core free for system/main thread if possible, but use at least 1
    const numWorkers = Math.max(1, numCPUs - 1);
    
    console.log(chalk.blue(`Spawning ${numWorkers} workers for parallel calculation...`));

    const exportData = [];
    let completed = 0;
    const total = files.length;
    
    // Queue management
    const fileQueue = [...files];
    const workers = [];
    
    // Promise that resolves when all work is done
    const workPromise = new Promise((resolve, reject) => {
        let activeWorkers = 0;

        const checkCompletion = () => {
            if (fileQueue.length === 0 && activeWorkers === 0) {
                resolve();
            }
        };

        const startWorker = (id) => {
            const worker = new Worker(WORKER_PATH);
            activeWorkers++;

            worker.on('message', (msg) => {
                if (msg.status === 'success') {
                    if (msg.data && msg.data.length) {
                        exportData.push(...msg.data);
                    }
                    completed++;
                    if (completed % 10 === 0 || completed === total) {
                        const pct = Math.round((completed / total) * 100);
                        process.stdout.write(`\rProgress: ${completed}/${total} (${pct}%)`);
                    }
                } else if (msg.status === 'error') {
                    // Log error but continue
                    // console.error(`Worker Error: ${msg.error}`);
                }

                // Pick next task
                if (fileQueue.length > 0) {
                    const nextFile = fileQueue.shift();
                    worker.postMessage({ filePath: nextFile });
                } else {
                    worker.terminate();
                    activeWorkers--;
                    checkCompletion();
                }
            });

            worker.on('error', (err) => {
                console.error(`Worker ${id} failed:`, err);
                activeWorkers--;
                checkCompletion();
            });

            // Initial task
            if (fileQueue.length > 0) {
                const nextFile = fileQueue.shift();
                worker.postMessage({ filePath: nextFile });
            } else {
                worker.terminate();
                activeWorkers--;
                checkCompletion();
            }
            
            return worker;
        };

        // Initialize pool
        for (let i = 0; i < numWorkers; i++) {
            workers.push(startWorker(i));
        }
    });

    const startTime = Date.now();
    await workPromise;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n'); // Newline after progress bar
    
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    
    // Sort consistently before saving (by ID)
    exportData.sort((a, b) => a.id.localeCompare(b.id));

    await fs.writeFile(OUTPUT_FILE, JSON.stringify(exportData, null, 2));
    
    console.log(chalk.green.bold(`✅ Export Complete in ${duration}s!`));
    console.log(chalk.white(`   Processed ${files.length} maps`));
    console.log(chalk.white(`   Generated ${exportData.length} difficulties`));
    console.log(chalk.gray(`   Saved to: ${OUTPUT_FILE}`));
}

main().catch(console.error);