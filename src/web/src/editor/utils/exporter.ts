import JSZip from 'jszip';
import { EditorMapData, EditorNote, HitsoundSettings } from '../types';
import { readFileFromProject } from './opfs';

const formatHitsound = (hs: HitsoundSettings) => {
    return {
        sampleSet: hs.sampleSet,
        volume: hs.volume,
        sounds: {
            hitnormal: true, // Always active base hit
            hitclap: hs.additions.clap,
            hitwhistle: hs.additions.whistle,
            hitfinish: hs.additions.finish
        }
    };
};

const formatNote = (n: EditorNote) => {
    const base = {
        key: n.key,
        // Game engine expects integer milliseconds
        time: Math.round(n.time) 
    };

    const hs = n.hitsound || { 
        sampleSet: 'normal', 
        volume: 100, 
        additions: { whistle: false, finish: false, clap: false } 
    };

    if (n.type === 'hold') {
        return {
            key: base.key,
            startTime: Math.round(n.time),
            endTime: Math.round(n.time + (n.duration || 0)),
            type: 'hold',
            hitsound: {
                sampleSet: hs.sampleSet,
                start: formatHitsound(hs),
                hold: {
                    volume: hs.volume,
                    loop: "normal"
                },
                end: {
                    volume: hs.volume,
                    sounds: {
                        hitnormal: true,
                        hitclap: false,
                        hitwhistle: false,
                        hitfinish: false
                    }
                }
            }
        };
    }

    return {
        ...base,
        type: 'tap',
        hitsound: formatHitsound(hs)
    };
};

export const exportBeatmapPackage = async (mapData: EditorMapData, projectId?: string) => {
    const zip = new JSZip();
    const mapsetId = Date.now().toString(36); // Generate unique ID
    const diffId = crypto.randomUUID();
    
    // Construct Difficulty Filename
    // e.g. "Artist - Title [DiffName].rtm.json"
    const safeArtist = (mapData.metadata.artist || 'Unknown').replace(/[^a-z0-9]/gi, '_');
    const safeTitle = (mapData.metadata.title || 'Untitled').replace(/[^a-z0-9]/gi, '_');
    const safeDiff = (mapData.metadata.difficultyName || 'Normal').replace(/[^a-z0-9]/gi, '_');
    const diffFilename = `${safeArtist}-${safeTitle}-${safeDiff}.rtm.json`;

    // 1. Meta JSON
    const meta = {
        mapsetId: mapsetId,
        songName: mapData.metadata.title,
        artistName: mapData.metadata.artist,
        mapper: mapData.metadata.mapper,
        description: "",
        tags: mapData.metadata.tags,
        language: "instrumental", // Default
        explicit: false,
        audioFile: mapData.metadata.audioFile || 'audio.mp3',
        backgroundFiles: mapData.metadata.backgroundFile ? [mapData.metadata.backgroundFile] : [],
        videoFile: null,
        videoStartTime: 0,
        timingPoints: mapData.timingPoints.map(tp => ({
            id: tp.id, // ID is numeric in example, but string in editor. 
            // Game might expect float ID or just ignore it. Keeping it simple.
            time: Math.round(tp.time) / 1000, // Seconds? Example uses seconds for time field in TPs
            bpm: tp.bpm,
            offset: Math.round(tp.time), // Milliseconds
            timeSignature: [tp.meter, 4]
        })),
        bpm: mapData.bpm,
        offset: mapData.offset,
        previewTime: mapData.metadata.previewTime,
        difficulties: [
            {
                diffId: diffId,
                name: mapData.metadata.difficultyName,
                filename: diffFilename
            }
        ],
        hasCustomHitsounds: false
    };

    zip.file('meta.json', JSON.stringify(meta, null, 2));

    // 2. Difficulty JSON (Strict RTM Format)
    const difficultyData = {
        mapsetId: mapsetId,
        diffId: diffId,
        name: mapData.metadata.difficultyName,
        overallDifficulty: 8, // Default OD
        bgFile: mapData.metadata.backgroundFile || '',
        notes: mapData.notes
            .sort((a, b) => a.time - b.time) // Ensure time sort
            .map(formatNote),
        typingSections: [], // Placeholder
        starRating: 0,
        starRatingNC: 0,
        starRatingHT: 0
    };

    zip.file(diffFilename, JSON.stringify(difficultyData, null, 2));

    // 3. Add Assets
    if (projectId) {
        if (mapData.metadata.audioFile) {
            const audioFile = await readFileFromProject(projectId, mapData.metadata.audioFile);
            if (audioFile) {
                zip.file(mapData.metadata.audioFile, audioFile);
            }
        }

        if (mapData.metadata.backgroundFile) {
            const bgFile = await readFileFromProject(projectId, mapData.metadata.backgroundFile);
            if (bgFile) {
                zip.file(mapData.metadata.backgroundFile, bgFile);
            }
        }
    }

    // Generate Blob
    const content = await zip.generateAsync({ type: 'blob' });
    
    // Trigger Download
    const zipName = `${mapData.metadata.artist} - ${mapData.metadata.title}.rtm`.replace(/[^a-z0-9 \-]/gi, '_');
    const url = URL.createObjectURL(content);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = zipName;
    a.click();
    URL.revokeObjectURL(url);
};