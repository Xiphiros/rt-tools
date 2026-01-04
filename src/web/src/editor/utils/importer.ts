import JSZip from 'jszip';
import { EditorMapData } from '../types';
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
        // RTMs can have multiple diffs. For the editor, we load the first one found.
        // In a real scenario, we might prompt the user, but for now we pick [0].
        if (!meta.difficulties || meta.difficulties.length === 0) {
            throw new Error("No difficulties found in RTM");
        }
        
        const diffRef = meta.difficulties[0];
        const diffFile = zip.file(diffRef.filename);
        if (!diffFile) throw new Error(`Difficulty file missing: ${diffRef.filename}`);
        
        const diffContent = await diffFile.async('string');
        const diffData = JSON.parse(diffContent);
        
        // 3. Construct Editor Data
        // Merge meta and diff data into our flat EditorMapData structure
        const editorData: EditorMapData = {
            metadata: {
                title: meta.songName || '',
                artist: meta.artistName || '',
                mapper: meta.mapper || '',
                difficultyName: diffRef.name || '',
                source: '', // RTM doesn't always have this
                tags: meta.tags || '',
                backgroundFile: (meta.backgroundFiles && meta.backgroundFiles[0]) || '',
                audioFile: meta.audioFile || '',
                previewTime: meta.previewTime || 0
            },
            notes: diffData.notes.map((n: any) => ({
                id: crypto.randomUUID(),
                time: n.time ?? n.startTime ?? 0,
                column: getKeyColumn(n.key),
                key: n.key,
                type: n.type,
                duration: n.endTime ? n.endTime - n.startTime : 0
            })),
            timingPoints: meta.timingPoints || [],
            bpm: meta.bpm || 120,
            offset: meta.offset || 0
        };

        // 4. Create Project in OPFS
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

// Helper to map keys to columns (Simple QWERTY layout assumption if needed)
// If the RTM keys are arbitrary, we might need a mapping strategy.
// For now, we trust the key character.
function getKeyColumn(key: string): number {
    const ROW_TOP = ['q','w','e','r','t','y','u','i','o','p'];
    const ROW_HOME = ['a','s','d','f','g','h','j','k','l',';'];
    const ROW_BOTTOM = ['z','x','c','v','b','n','m',',','.','/'];
    
    const k = key.toLowerCase();
    if (ROW_TOP.includes(k)) return 0;
    if (ROW_HOME.includes(k)) return 1;
    if (ROW_BOTTOM.includes(k)) return 2;
    return 0; // Default
}