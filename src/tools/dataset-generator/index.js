import { glob } from 'glob';
import path from 'path';
import fs from 'fs/promises';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { calculateStrain, calculateOfficial } from '@rt-tools/sr-calculator';
import { parseRtmFile } from './rtm-parser.js';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script is in: src/tools/dataset-generator
// Root is:      ../../../
const SONGS_DIR = path.resolve(__dirname, '../../../songs');
const OUTPUT_FILE = path.resolve(__dirname, '../../web/public/beatmaps.json');

async function main() {
    console.log(chalk.cyan(`🔍 Scanning for .rtm files in: ${SONGS_DIR}`));
    
    // Find all map files
    // Use posix style paths for glob even on Windows
    const searchPattern = `${SONGS_DIR}/**/*.rtm`.replace(/\\/g, '/');
    const files = await glob(searchPattern);

    if (files.length === 0) {
        console.warn(chalk.yellow(`No beatmaps found in ${SONGS_DIR}.`));
        console.warn(chalk.yellow(`Please ensure the path is correct or place .rtm files there.`));
        // Don't exit here, allows generating empty DB if that's intended, though unlikely
    } else {
        console.log(chalk.blue(`Found ${files.length} beatmaps. Calculating strain...`));
    }

    const exportData = [];
    let processed = 0;

    for (const file of files) {
        const result = await parseRtmFile(file);
        if (!result) continue;

        const { meta, difficulties } = result;
        
        let mapsetId = meta.mapsetId;
        if (!mapsetId) {
            const basename = path.basename(file);
            const match = basename.match(/^([a-z0-9]+)-/i);
            if (match) mapsetId = match[1];
        }

        const mapLink = mapsetId ? `https://rhythmtyper.net/beatmap/${mapsetId}` : null;

        for (const diff of difficulties) {
            if (!diff.data || !diff.data.notes) continue;

            const baseOD = diff.data.overallDifficulty || 5;
            const notes = diff.data.notes;

            // 1. Run New Rework Algorithm
            const strain = calculateStrain(notes, baseOD);

            // 2. Run Official Algorithm
            const officialSR = calculateOfficial({
                notes: notes,
                overallDifficulty: baseOD
            });

            exportData.push({
                id: `${mapsetId || Date.now()}_${diff.diffId}`,
                title: meta.songName || meta.title || 'Unknown',
                artist: meta.artistName || meta.artist || 'Unknown',
                mapper: meta.mapper || 'Unknown',
                diffName: diff.name,
                bpm: meta.bpm || 0,
                stars: strain.total,
                starsOfficial: officialSR || 0, // Fallback for safety
                stats: strain.details,
                link: mapLink
            });
        }
        
        processed++;
        if (processed % 5 === 0) process.stdout.write('.');
    }

    console.log('\n');
    
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(exportData, null, 2));
    console.log(chalk.green.bold(`✅ Export Complete! Saved ${exportData.length} difficulties to:`));
    console.log(chalk.gray(OUTPUT_FILE));
}

main().catch(console.error);