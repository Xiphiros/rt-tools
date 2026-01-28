import JSZip from 'jszip';
import { EditorMapData, HitsoundSettings, LoopSettings, TimingPoint } from '../types';
import { createProject, saveDifficulty, saveFileToProject } from './opfs';
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

        if (!meta.difficulties || meta.difficulties.length === 0) {
            throw new Error("No difficulties found in RTM");
        }

        const projectId = crypto.randomUUID();
        let projectCreated = false;
        let diffsImported = 0;

        // 2. Iterate all difficulties in metadata
        for (const diffRef of meta.difficulties) {
            // Attempt to find file (Loose matching for trailing spaces issue)
            let diffFile = zip.file(diffRef.filename);
            
            if (!diffFile) {
                // Try trimming spaces if exact match fails (Windows/OS compat)
                const trimmedName = diffRef.filename.trim();
                diffFile = zip.file(trimmedName);
                
                // Try removing space before extension (e.g. "Name .rtm.json" -> "Name.rtm.json")
                if (!diffFile) {
                    const fixedName = diffRef.filename.replace(/ \.rtm\.json$/i, '.rtm.json');
                    diffFile = zip.file(fixedName);
                }
            }

            if (!diffFile) {
                console.warn(`[Importer] Skipping missing file: ${diffRef.filename}`);
                continue;
            }

            const diffContent = await diffFile.async('string');
            let diffData;
            try {
                diffData = JSON.parse(diffContent);
            } catch (e) {
                console.warn(`[Importer] Failed to parse JSON for ${diffRef.filename}`);
                continue;
            }

            // 3. Construct Editor Data
            const editorData: EditorMapData = {
                diffId: diffData.diffId || crypto.randomUUID(),
                metadata: {
                    title: meta.songName || '',
                    artist: meta.artistName || '',
                    mapper: meta.mapper || '',
                    difficultyName: diffRef.name || diffData.name || 'Unknown',
                    overallDifficulty: diffData.overallDifficulty ?? 8,
                    source: '',
                    tags: meta.tags || '',
                    backgroundFile: (meta.backgroundFiles && meta.backgroundFiles[0]) || '',
                    audioFile: meta.audioFile || '',
                    previewTime: meta.previewTime || 0
                },
                notes: (diffData.notes || []).map((n: any) => {
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

                    let headHS = parseHS(n.hitsound);
                    let tailHS: HitsoundSettings | undefined = undefined;
                    let loopHS: LoopSettings | undefined = undefined;

                    if (n.type === 'hold' && n.hitsound) {
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
                timingPoints: (meta.timingPoints || []).map((tp: any) => {
                    let msTime = 0;
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

            // 4. Save to Project
            // If it's the first successful diff, create the project structure.
            // Otherwise, append the difficulty file.
            if (!projectCreated) {
                await createProject(projectId, editorData);
                projectCreated = true;
            } else {
                await saveDifficulty(projectId, editorData);
            }
            diffsImported++;
        }

        if (!projectCreated) {
            throw new Error("No valid difficulties could be imported.");
        }

        // 5. Extract Assets (Once per project)
        // We scan all difficulties to find all unique asset references
        // But since meta.json usually lists them globally or we can use the first diff's metadata
        // we'll stick to the global meta fields if available, or just standard names.
        
        const audioName = meta.audioFile || 'audio.mp3';
        const audioBlob = await zip.file(audioName)?.async('blob');
        if (audioBlob) {
            await saveFileToProject(projectId, audioName, audioBlob);
        }

        // Handle Backgrounds (meta.backgroundFiles is array)
        if (meta.backgroundFiles && Array.isArray(meta.backgroundFiles)) {
            for (const bgName of meta.backgroundFiles) {
                const bgBlob = await zip.file(bgName)?.async('blob');
                if (bgBlob) {
                    await saveFileToProject(projectId, bgName, bgBlob);
                }
            }
        } else if (meta.backgroundFile) {
            // Fallback for legacy meta
             const bgBlob = await zip.file(meta.backgroundFile)?.async('blob');
             if (bgBlob) {
                 await saveFileToProject(projectId, meta.backgroundFile, bgBlob);
             }
        }

        console.log(`[Importer] Successfully imported ${diffsImported} difficulties.`);
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