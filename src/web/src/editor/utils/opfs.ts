// Origin Private File System Utilities
// Structure:
// /projects/
//   /{uuid}/
//     map.json
//     audio.mp3
//     bg.jpg

import { EditorMapData, ProjectSummary } from '../types';

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

    // Iterate over project folders
    // @ts-ignore - TS types for FileSystemHandle iteration might be missing in some setups
    for await (const [name, handle] of projectsDir.entries()) {
        if (handle.kind === 'directory') {
            try {
                // Try to read map.json to get metadata
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
            } catch (e) {
                // Corrupt or empty project
                summaries.push({
                    id: name,
                    title: 'Corrupt Project',
                    artist: '-',
                    mapper: '-',
                    lastModified: 0
                });
            }
        }
    }
    
    return summaries.sort((a, b) => b.lastModified - a.lastModified);
};

export const createProject = async (id: string, initialData: EditorMapData) => {
    await saveProjectJSON(id, initialData);
};

export const deleteProject = async (id: string) => {
    const projectsDir = await getProjectsDir();
    await projectsDir.removeEntry(id, { recursive: true });
};

// --- JSON IO ---

export const saveProjectJSON = async (projectId: string, data: EditorMapData) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await saveFileToProject(projectId, 'map.json', blob);
};

export const loadProjectJSON = async (projectId: string): Promise<EditorMapData | null> => {
    try {
        const file = await readFileFromProject(projectId, 'map.json');
        if (!file) return null;
        const text = await file.text();
        return JSON.parse(text);
    } catch (e) {
        console.error(`Failed to load project ${projectId}`, e);
        return null;
    }
};