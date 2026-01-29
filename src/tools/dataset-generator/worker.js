import { parentPort } from 'worker_threads';
import path from 'path';
import srCalculator from '@rt-tools/sr-calculator';
import { parseRtmFile } from './rtm-parser.js';

const { calculateStrain, calculateOfficial, utils } = srCalculator;

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

        // 1. Nomod Calculation
        const strainNM = calculateStrain(notes, baseOD);

        // 2. DT Calculation (1.5x speed)
        // Rate: 1.5, OD Scaled
        const notesDT = utils.scaleNotes(notes, 1.5);
        const odDT = utils.scaleOD(baseOD, 1.5);
        const strainDT = calculateStrain(notesDT, odDT);

        // 3. HT Calculation (0.75x speed)
        // Rate: 0.75, OD Scaled
        const notesHT = utils.scaleNotes(notes, 0.75);
        const odHT = utils.scaleOD(baseOD, 0.75);
        const strainHT = calculateStrain(notesHT, odHT);

        // 4. Official Calculation (Nomod only needed for reference)
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
            
            // Star Ratings
            stars: strainNM.total,
            starsDT: strainDT.total,
            starsHT: strainHT.total,
            
            starsOfficial: officialSR || 0,
            stats: strainNM.details,
            link: mapLink
        });
    }

    return exportData;
}