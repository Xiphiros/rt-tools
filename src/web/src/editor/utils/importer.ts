import JSZip from 'jszip';
import { EditorMapData, HitsoundSettings, LoopSettings, TimingPoint } from '../types';
import { createProject, saveFileToProject } from './opfs';
import { checkSourceConsistency, validateMapData } from './validation';

export const importRtmPackage = async (file: File): Promise<string | null> => {
    try {
        const zip = await JSZip.loadAsync(file);
        
        // 1. Parse Meta
        const metaFile = zip.file('meta.json');
        if (!metaFile) throw new Error("Invalid RTM: Missing meta.json");
        
        const metaContent = await metaFile.async('string');
        const meta = JSON.parse(metaContent);
        
        // CHECK CONSISTENCY
        checkSourceConsistency(meta);

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
                // Helper to parse a raw JSON hitsound block into internal structure
                const parseHS = (raw: any): HitsoundSettings => {
                    if (!raw) return {
                        sampleSet: 'normal',
                        volume: 100,
                        additions: { whistle: false, finish: false, clap: false }
                    };
                    
                    const additions = raw.sounds || {};
                    return {
                        sampleSet: raw.sampleSet || 'normal',
                        volume: raw.volume ?? 100,
                        additions: {
                            whistle: !!additions.hitwhistle,
                            finish: !!additions.hitfinish,
                            clap: !!additions.hitclap
                        }
                    };
                };

                // Primary (Head)
                let headHS = parseHS(n.hitsound);
                let tailHS: HitsoundSettings | undefined = undefined;
                let loopHS: LoopSettings | undefined = undefined;

                if (n.type === 'hold' && n.hitsound) {
                    // Check for nested structure (RTM Format)
                    if (n.hitsound.start) {
                        headHS = parseHS(n.hitsound.start);
                        if (!n.hitsound.start.sampleSet && n.hitsound.sampleSet) {
                            headHS.sampleSet = n.hitsound.sampleSet;
                        }
                    }

                    if (n.hitsound.end) {
                        tailHS = parseHS(n.hitsound.end);
                        if (!n.hitsound.end.sampleSet && n.hitsound.sampleSet) {
                             tailHS.sampleSet = n.hitsound.sampleSet;
                        }
                    }

                    if (n.hitsound.hold) {
                        loopHS = {
                            sampleSet: n.hitsound.hold.loop || n.hitsound.sampleSet || 'normal',
                            volume: n.hitsound.hold.volume ?? 100
                        };
                    }
                }

                // NOTE PARSING:
                const startTime = n.time ?? n.startTime ?? 0;
                const endTime = n.endTime ?? startTime;

                return {
                    id: crypto.randomUUID(),
                    time: startTime,
                    column: getKeyColumn(n.key),
                    key: n.key,
                    type: n.type,
                    duration: endTime - startTime,
                    hitsound: headHS,
                    holdTailHitsound: tailHS,
                    holdLoopHitsound: loopHS,
                    layerId: 'default-layer' 
                };
            }),
            layers: [
                { id: 'default-layer', name: 'Imported', visible: true, locked: false, color: '#38bdf8' }
            ],
            // Parse Timing Points
            timingPoints: (meta.timingPoints || []).map((tp: any) => {
                let msTime = 0;
                
                // Priority: 'offset' (Explicit MS) -> 'time' * 1000 (Seconds to MS)
                // This ensures we respect the musical anchor even if 'time' (start time) drifts
                if (typeof tp.offset === 'number') {
                    msTime = tp.offset;
                } else if (typeof tp.time === 'number') {
                    msTime = tp.time * 1000;
                }

                return {
                    id: String(tp.id || crypto.randomUUID()),
                    time: msTime,
                    bpm: tp.bpm || 120,
                    meter: tp.timeSignature ? tp.timeSignature[0] : 4,
                    kiai: false
                } as TimingPoint;
            }),
            bpm: meta.bpm || 120,
            offset: meta.offset || 0
        };

        // RUN VALIDATION
        const validation = validateMapData(editorData);
        if (!validation.valid) {
            console.error("Map Validation Errors:", validation.errors);
            alert(`Map issues detected:\n${validation.errors.join('\n')}`);
            return null;
        }
        if (validation.warnings.length > 0) {
            console.warn("Map Warnings:", validation.warnings);
        }

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