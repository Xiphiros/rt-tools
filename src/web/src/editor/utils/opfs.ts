// Origin Private File System Utilities
// Structure:
// /projects/
//   /{uuid}/
//     diff_{uuid}.json
//     audio.mp3
//     bg.jpg

import { EditorMapData, ProjectSummary, DifficultySummary } from '../types';

const PROJECTS_DIR = 'projects';

async function getRoot() {
    return await navigator.storage.getDirectory();
}

async function getProjectsDir() {
    const root = await getRoot();
    return await root.getDirectoryHandle(PROJECTS_DIR, { create: true });
}

export const getProjectDir = async (projectId: string, create = false) => {
    const projects = await getProjectsDir();
    return await projects.getDirectoryHandle(projectId, { create });
};

// --- FILE OPERATIONS (Scoped to Project) ---

export const saveFileToProject = async (projectId: string, filename: string, file: File | Blob) => {
    try {
        const dir = await getProjectDir(projectId, true);
        const fileHandle = await dir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(file);
        await writable.close();
        return true;
    } catch (e) {
        console.error("OPFS Save Error:", e);
        return false;
    }
};

export const readFileFromProject = async (projectId: string, filename: string): Promise<File | null> => {
    try {
        const dir = await getProjectDir(projectId);
        const fileHandle = await dir.getFileHandle(filename);
        return await fileHandle.getFile();
    } catch (e) {
        return null;
    }
};

// --- PROJECT MANAGEMENT ---

export const listProjects = async (): Promise<ProjectSummary[]> => {
    const projectsDir = await getProjectsDir();
    const summaries: ProjectSummary[] = [];

    // @ts-ignore
    for await (const [name, handle] of projectsDir.entries()) {
        if (handle.kind === 'directory') {
            try {
                // Try to find ANY diff file to get metadata
                let metadataFound = false;
                // @ts-ignore
                for await (const [fileName, fileHandle] of handle.entries()) {
                    if (fileName.startsWith('diff_') && fileName.endsWith('.json')) {
                         const file = await fileHandle.getFile();
                         const text = await file.text();
                         const data = JSON.parse(text) as EditorMapData;
                         
                         summaries.push({
                             id: name,
                             title: data.metadata.title || 'Untitled',
                             artist: data.metadata.artist || 'Unknown',
                             mapper: data.metadata.mapper || 'Unknown',
                             lastModified: file.lastModified
                         });
                         metadataFound = true;
                         break;
                    }
                }
                
                // Fallback for legacy "map.json" projects
                if (!metadataFound) {
                    try {
                        const fileHandle = await handle.getFileHandle('map.json');
                        const file = await fileHandle.getFile();
                        const text = await file.text();
                        const data = JSON.parse(text) as EditorMapData;
                        summaries.push({
                            id: name,
                            title: data.metadata.title || 'Untitled',
                            artist: data.metadata.artist || 'Unknown',
                            mapper: data.metadata.mapper || 'Unknown',
                            lastModified: file.lastModified
                        });
                    } catch {}
                }
            } catch (e) {
                // Ignore corrupt
            }
        }
    }
    
    return summaries.sort((a, b) => b.lastModified - a.lastModified);
};

export const createProject = async (id: string, initialData: EditorMapData) => {
    await saveDifficulty(id, initialData);
};

export const deleteProject = async (id: string) => {
    const projectsDir = await getProjectsDir();
    await projectsDir.removeEntry(id, { recursive: true });
};

// --- DIFFICULTY MANAGEMENT ---

export const saveDifficulty = async (projectId: string, data: EditorMapData) => {
    const filename = `diff_${data.diffId}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await saveFileToProject(projectId, filename, blob);
    
    // Clean up legacy map.json if it exists and we are migrating
    try {
        const dir = await getProjectDir(projectId);
        await dir.removeEntry('map.json');
    } catch {}
};

export const loadDifficulty = async (projectId: string, diffId: string): Promise<EditorMapData | null> => {
    try {
        const file = await readFileFromProject(projectId, `diff_${diffId}.json`);
        if (!file) return null;
        const text = await file.text();
        return JSON.parse(text);
    } catch (e) {
        console.error(`Failed to load difficulty ${diffId}`, e);
        return null;
    }
};

export const listDifficulties = async (projectId: string): Promise<DifficultySummary[]> => {
    try {
        const dir = await getProjectDir(projectId);
        const diffs: DifficultySummary[] = [];

        // @ts-ignore
        for await (const [name, handle] of dir.entries()) {
            if (name.startsWith('diff_') && name.endsWith('.json')) {
                const file = await handle.getFile();
                const text = await file.text();
                const data = JSON.parse(text) as EditorMapData;
                diffs.push({
                    id: data.diffId,
                    name: data.metadata.difficultyName || 'Unnamed',
                    lastModified: file.lastModified
                });
            }
        }

        // Handle Legacy
        if (diffs.length === 0) {
            try {
                const file = await readFileFromProject(projectId, 'map.json');
                if (file) {
                    const text = await file.text();
                    const data = JSON.parse(text) as EditorMapData;
                    // Auto-assign ID if missing
                    const id = data.diffId || crypto.randomUUID();
                    diffs.push({
                        id: id,
                        name: data.metadata.difficultyName || 'Normal',
                        lastModified: file.lastModified
                    });
                }
            } catch {}
        }

        return diffs.sort((a, b) => b.lastModified - a.lastModified);
    } catch {
        return [];
    }
};

export const deleteDifficulty = async (projectId: string, diffId: string) => {
    try {
        const dir = await getProjectDir(projectId);
        await dir.removeEntry(`diff_${diffId}.json`);
    } catch (e) {
        console.error("Failed to delete difficulty", e);
    }
};

// Compatibility Wrapper for LoadProject (Defaults to first found difficulty)
export const loadProjectAnyDiff = async (projectId: string): Promise<EditorMapData | null> => {
    const diffs = await listDifficulties(projectId);
    if (diffs.length > 0) {
        // Prefer one named 'map.json' if migrating? No, listDifficulties handles legacy read.
        // If it was legacy, it returned a virtual entry.
        // We try to load the actual file.
        
        let data = await loadDifficulty(projectId, diffs[0].id);
        
        // If failed (maybe legacy map.json), try legacy load
        if (!data) {
             const file = await readFileFromProject(projectId, 'map.json');
             if (file) {
                 const text = await file.text();
                 data = JSON.parse(text);
                 // Migrate ID
                 if (data && !data.diffId) data.diffId = diffs[0].id;
             }
        }
        return data;
    }
    return null;
};