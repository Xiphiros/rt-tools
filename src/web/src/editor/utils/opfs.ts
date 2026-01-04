// Origin Private File System Utilities

const ROOT_DIR = 'rt-editor-project';

async function getRoot() {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(ROOT_DIR, { create: true });
}

export const saveFileToOPFS = async (filename: string, file: File | Blob) => {
    try {
        const root = await getRoot();
        const fileHandle = await root.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(file);
        await writable.close();
        return true;
    } catch (e) {
        console.error("OPFS Save Error:", e);
        return false;
    }
};

export const readFileFromOPFS = async (filename: string): Promise<File | null> => {
    try {
        const root = await getRoot();
        const fileHandle = await root.getFileHandle(filename, { create: false });
        return await fileHandle.getFile();
    } catch (e) {
        // File not found is expected on fresh start
        return null;
    }
};

export const saveProjectJSON = async (data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await saveFileToOPFS('map.json', blob);
};

export const loadProjectJSON = async () => {
    const file = await readFileFromOPFS('map.json');
    if (!file) return null;
    const text = await file.text();
    return JSON.parse(text);
};