import JSZip from 'jszip';
import { EditorMapData } from '../types';
import { readFileFromOPFS } from './opfs';

export const exportBeatmapPackage = async (mapData: EditorMapData) => {
    const zip = new JSZip();

    // 1. Add Meta/Diff JSON
    // Standard RTM structure: 
    // - meta.json
    // - difficulty.rtm.json
    
    // Construct meta.json (subset of mapData)
    const meta = {
        mapsetId: Date.now().toString(36), // Temp ID
        songName: mapData.metadata.title,
        artistName: mapData.metadata.artist,
        mapper: mapData.metadata.mapper,
        difficultyName: mapData.metadata.difficultyName,
        audioFile: mapData.metadata.audioFile || 'audio.mp3',
        backgroundFiles: mapData.metadata.backgroundFile ? [mapData.metadata.backgroundFile] : [],
        bpm: mapData.bpm,
        offset: mapData.offset,
        previewTime: mapData.metadata.previewTime,
        difficulties: [
            {
                diffId: crypto.randomUUID(),
                name: mapData.metadata.difficultyName,
                filename: 'beatmap.rtm.json'
            }
        ]
    };

    zip.file('meta.json', JSON.stringify(meta, null, 2));

    // Construct Difficulty JSON
    const difficultyData = {
        ...mapData,
        // Ensure notes are clean
        notes: mapData.notes.map(n => ({
            key: n.key,
            time: n.time,
            type: n.type,
            // Only include duration if hold
            ...(n.type === 'hold' ? { duration: n.duration } : {})
        }))
    };

    zip.file('beatmap.rtm.json', JSON.stringify(difficultyData, null, 2));

    // 2. Add Audio
    const audioFile = await readFileFromOPFS(mapData.metadata.audioFile || 'audio.mp3');
    if (audioFile) {
        zip.file(mapData.metadata.audioFile || 'audio.mp3', audioFile);
    }

    // 3. Add Background
    if (mapData.metadata.backgroundFile) {
        const bgFile = await readFileFromOPFS(mapData.metadata.backgroundFile);
        if (bgFile) {
            zip.file(mapData.metadata.backgroundFile, bgFile);
        }
    }

    // Generate Blob
    const content = await zip.generateAsync({ type: 'blob' });
    
    // Trigger Download
    const filename = `${mapData.metadata.artist} - ${mapData.metadata.title}.rtm`.replace(/[^a-z0-9 \-]/gi, '_');
    const url = URL.createObjectURL(content);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};