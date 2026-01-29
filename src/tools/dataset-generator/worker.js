import { parentPort } from 'worker_threads';
import path from 'path';
import { calculateStrain, calculateOfficial } from '@rt-tools/sr-calculator';
import { parseRtmFile } from './rtm-parser.js';

// Worker Logic: Receives a file path, processes it, returns array of map entries
parentPort.on('message', async (task) => {
    try {
        const { filePath } = task;
        const result = await processFile(filePath);
        parentPort.postMessage({ status: 'success', data: result });
    } catch (e) {
        parentPort.postMessage({ status: 'error', error: e.message });
    }
});

async function processFile(filePath) {
    const result = await parseRtmFile(filePath);
    if (!result) return [];

    const { meta, difficulties } = result;
    const exportData = [];
    
    let mapsetId = meta.mapsetId;
    if (!mapsetId) {
        const basename = path.basename(filePath);
        const match = basename.match(/^([a-z0-9]+)-/i);
        if (match) mapsetId = match[1];
    }

    const mapLink = mapsetId ? `https://rhythmtyper.net/beatmap/${mapsetId}` : null;

    for (const diff of difficulties) {
        if (!diff.data || !diff.data.notes) continue;

        const baseOD = diff.data.overallDifficulty || 5;
        const notes = diff.data.notes;

        // 1. Run New Rework Algorithm
        // Heavy CPU Task
        const strain = calculateStrain(notes, baseOD);

        // 2. Run Official Algorithm
        // Heavy CPU Task
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

    return exportData;
}