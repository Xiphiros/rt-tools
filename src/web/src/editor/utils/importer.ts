import JSZip from 'jszip';
import { EditorMapData, HitsoundSettings } from '../types';
import { createProject, saveFileToProject } from './opfs';

export const importRtmPackage = async (file: File): Promise<string | null> => {
    try {
        const zip = await JSZip.loadAsync(file);
        
        // 1. Parse Meta
        const metaFile = zip.file('meta.json');
        if (!metaFile) throw new Error("Invalid RTM: Missing meta.json");
        
        const metaContent = await metaFile.async('string');
        const meta = JSON.parse(metaContent);
        
        // 2. Determine Difficulty to Load
        if (!meta.difficulties || meta.difficulties.length === 0) {
            throw new Error("No difficulties found in RTM");
        }
        
        const diffRef = meta.difficulties[0];
        const diffFile = zip.file(diffRef.filename);
        if (!diffFile) throw new Error(`Difficulty file missing: ${diffRef.filename}`);
        
        const diffContent = await diffFile.async('string');
        const diffData = JSON.parse(diffContent);
        
        // 3. Construct Editor Data
        const editorData: EditorMapData = {
            diffId: diffData.diffId || crypto.randomUUID(),
            metadata: {
                title: meta.songName || '',
                artist: meta.artistName || '',
                mapper: meta.mapper || '',
                difficultyName: diffRef.name || '',
                overallDifficulty: diffData.overallDifficulty ?? 8,
                source: '',
                tags: meta.tags || '',
                backgroundFile: (meta.backgroundFiles && meta.backgroundFiles[0]) || '',
                audioFile: meta.audioFile || '',
                previewTime: meta.previewTime || 0
            },
            notes: diffData.notes.map((n: any) => {
                // Parse Hitsound
                const hs: HitsoundSettings = {
                    sampleSet: 'normal',
                    volume: 100,
                    additions: { whistle: false, finish: false, clap: false }
                };

                if (n.hitsound) {
                    hs.sampleSet = n.hitsound.sampleSet || 'normal';
                    hs.volume = n.hitsound.volume ?? 100;
                    if (n.hitsound.sounds) {
                        hs.additions.whistle = !!n.hitsound.sounds.hitwhistle;
                        hs.additions.finish = !!n.hitsound.sounds.hitfinish;
                        hs.additions.clap = !!n.hitsound.sounds.hitclap;
                    }
                }

                return {
                    id: crypto.randomUUID(),
                    time: n.time ?? n.startTime ?? 0,
                    column: getKeyColumn(n.key),
                    key: n.key,
                    type: n.type,
                    duration: n.endTime ? n.endTime - n.startTime : 0,
                    hitsound: hs,
                    layerId: 'default-layer' // Assign to default during import
                };
            }),
            layers: [
                { id: 'default-layer', name: 'Imported', visible: true, locked: false, color: '#38bdf8' }
            ],
            timingPoints: meta.timingPoints || [],
            bpm: meta.bpm || 120,
            offset: meta.offset || 0
        };

        // 4. Create Project
        const projectId = crypto.randomUUID();
        await createProject(projectId, editorData);

        // 5. Extract Assets
        if (editorData.metadata.audioFile) {
            const audioBlob = await zip.file(editorData.metadata.audioFile)?.async('blob');
            if (audioBlob) {
                await saveFileToProject(projectId, editorData.metadata.audioFile, audioBlob);
            }
        }

        if (editorData.metadata.backgroundFile) {
            const bgBlob = await zip.file(editorData.metadata.backgroundFile)?.async('blob');
            if (bgBlob) {
                await saveFileToProject(projectId, editorData.metadata.backgroundFile, bgBlob);
            }
        }

        return projectId;

    } catch (e) {
        console.error("Import failed:", e);
        alert(`Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
        return null;
    }
};

function getKeyColumn(key: string): number {
    const ROW_TOP = ['q','w','e','r','t','y','u','i','o','p'];
    const ROW_HOME = ['a','s','d','f','g','h','j','k','l',';'];
    const ROW_BOTTOM = ['z','x','c','v','b','n','m',',','.','/'];
    
    const k = key.toLowerCase();
    if (ROW_TOP.includes(k)) return 0;
    if (ROW_HOME.includes(k)) return 1;
    if (ROW_BOTTOM.includes(k)) return 2;
    return 0; 
}