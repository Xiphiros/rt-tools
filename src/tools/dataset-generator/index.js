import { glob } from 'glob';
import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';
import { calculateStrain } from '@rt-tools/sr-calculator';
import { parseRtmFile } from './rtm-parser.js';

// Configuration
const SONGS_DIR = path.resolve('../../../songs');
const OUTPUT_FILE = path.resolve('../../web/public/beatmaps.json');

async function main() {
    console.log(chalk.cyan('🔍 Scanning for .rtm files...'));
    
    // Find all map files
    // Note: In a real run, ensure the relative path to 'songs' is correct
    const files = await glob(`${SONGS_DIR}/*.rtm`.replace(/\\/g, '/'));

    if (files.length === 0) {
        console.warn(chalk.yellow(`No beatmaps found in ${SONGS_DIR}.`));
        console.warn(chalk.yellow(`Please ensure the path is correct or place .rtm files there.`));
    }

    console.log(chalk.blue(`Found ${files.length} beatmaps. Calculating strain...`));

    const exportData = [];
    let processed = 0;

    for (const file of files) {
        const result = await parseRtmFile(file);
        if (!result) continue;

        const { meta, difficulties } = result;

        for (const diff of difficulties) {
            if (!diff.data || !diff.data.notes) continue;

            const baseOD = diff.data.overallDifficulty || 5;
            const notes = diff.data.notes;

            // Run the algorithm
            const strain = calculateStrain(notes, baseOD);

            exportData.push({
                id: `${meta.mapsetId || Date.now()}_${diff.diffId}`,
                title: meta.songName || meta.title || 'Unknown',
                artist: meta.artistName || meta.artist || 'Unknown',
                mapper: meta.mapper || 'Unknown',
                diffName: diff.name,
                bpm: meta.bpm || 0,
                stars: strain.total,
                stats: strain.details
            });
        }
        
        processed++;
        if (processed % 5 === 0) process.stdout.write('.');
    }

    console.log('\n');
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(exportData, null, 2));
    console.log(chalk.green.bold(`✅ Export Complete! Saved ${exportData.length} difficulties to:`));
    console.log(chalk.gray(OUTPUT_FILE));
}

main().catch(console.error);