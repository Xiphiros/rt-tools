import JSZip from 'jszip';
import { EditorMapData, EditorNote, HitsoundSettings } from '../types';
import { readFileFromProject, listDifficulties, loadDifficulty } from './opfs';

const formatHitsound = (hs: HitsoundSettings) => {
    return {
        sampleSet: hs.sampleSet,
        volume: hs.volume,
        sounds: {
            hitnormal: true, 
            hitclap: hs.additions.clap,
            hitwhistle: hs.additions.whistle,
            hitfinish: hs.additions.finish
        }
    };
};

const formatNote = (n: EditorNote) => {
    const base = {
        key: n.key,
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

export const exportBeatmapPackage = async (currentMapData: EditorMapData, projectId?: string) => {
    const zip = new JSZip();
    
    let difficultiesToExport: EditorMapData[] = [];

    if (projectId) {
        const summaries = await listDifficulties(projectId);
        for (const summary of summaries) {
            const data = await loadDifficulty(projectId, summary.id);
            if (data) difficultiesToExport.push(data);
        }
        if (difficultiesToExport.length === 0) {
            difficultiesToExport.push(currentMapData);
        }
    } else {
        difficultiesToExport.push(currentMapData);
    }

    const primaryDiff = difficultiesToExport[0];
    const mapsetId = projectId || Date.now().toString(36);
    
    const safeArtist = (primaryDiff.metadata.artist || 'Unknown').replace(/[<>:"/\\|?*]/g, '_');
    const safeTitle = (primaryDiff.metadata.title || 'Untitled').replace(/[<>:"/\\|?*]/g, '_');

    const diffMetadataList = difficultiesToExport.map(diff => {
        const safeDiffName = (diff.metadata.difficultyName || 'Normal').replace(/[<>:"/\\|?*]/g, '_');
        const filename = `${safeArtist} - ${safeTitle} [${safeDiffName}].rtm.json`;
        
        const rtmData = {
            mapsetId: mapsetId,
            diffId: diff.diffId,
            name: diff.metadata.difficultyName,
            overallDifficulty: diff.metadata.overallDifficulty ?? 8, // Export OD
            bgFile: diff.metadata.backgroundFile || '',
            notes: diff.notes
                .sort((a, b) => a.time - b.time)
                .map(formatNote),
            typingSections: [], 
            starRating: 0,
            starRatingNC: 0,
            starRatingHT: 0
        };

        zip.file(filename, JSON.stringify(rtmData, null, 2));

        return {
            diffId: diff.diffId,
            name: diff.metadata.difficultyName,
            filename: filename
        };
    });

    const meta = {
        mapsetId: mapsetId,
        songName: primaryDiff.metadata.title,
        artistName: primaryDiff.metadata.artist,
        mapper: primaryDiff.metadata.mapper,
        description: "",
        tags: primaryDiff.metadata.tags,
        language: "instrumental",
        explicit: false,
        audioFile: primaryDiff.metadata.audioFile || 'audio.mp3',
        backgroundFiles: primaryDiff.metadata.backgroundFile ? [primaryDiff.metadata.backgroundFile] : [],
        videoFile: null,
        videoStartTime: 0,
        timingPoints: primaryDiff.timingPoints.map(tp => ({
            id: typeof tp.id === 'string' ? parseFloat(tp.id) || Date.now() : tp.id, 
            time: tp.time / 1000, 
            bpm: tp.bpm,
            offset: tp.time,      
            timeSignature: [tp.meter, 4]
        })),
        bpm: primaryDiff.bpm,
        offset: primaryDiff.offset,
        previewTime: primaryDiff.metadata.previewTime,
        difficulties: diffMetadataList,
        hasCustomHitsounds: false
    };

    zip.file('meta.json', JSON.stringify(meta, null, 2));

    if (projectId) {
        const addedFiles = new Set<string>();
        for (const diff of difficultiesToExport) {
            const files = [diff.metadata.audioFile, diff.metadata.backgroundFile];
            for (const filename of files) {
                if (filename && !addedFiles.has(filename)) {
                    const file = await readFileFromProject(projectId, filename);
                    if (file) {
                        zip.file(filename, file);
                        addedFiles.add(filename);
                    }
                }
            }
        }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const packageName = `${safeArtist} - ${safeTitle}.rtm`;
    
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = packageName;
    a.click();
    URL.revokeObjectURL(url);
};