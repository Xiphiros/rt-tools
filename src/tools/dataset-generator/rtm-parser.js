import fs from 'fs/promises';
import JSZip from 'jszip';

export async function parseRtmFile(filePath) {
    try {
        const data = await fs.readFile(filePath);
        const zip = await JSZip.loadAsync(data);

        // 1. Load Metadata
        const metaFile = Object.keys(zip.files).find(name => name.toLowerCase().endsWith('meta.json'));
        if (!metaFile) return null;

        const metaContent = await zip.file(metaFile).async('string');
        const meta = JSON.parse(metaContent);

        // 2. Parse Difficulties
        const parsedDifficulties = [];

        if (Array.isArray(meta.difficulties)) {
            for (const diffRef of meta.difficulties) {
                const diffFile = Object.keys(zip.files).find(name => name === diffRef.filename);
                if (diffFile) {
                    const diffContent = await zip.file(diffFile).async('string');
                    try {
                        const diffData = JSON.parse(diffContent);
                        parsedDifficulties.push({
                            name: diffRef.name,
                            diffId: diffRef.diffId || diffRef.id,
                            data: diffData
                        });
                    } catch (e) {
                        // Ignore malformed difficulty files
                    }
                }
            }
        }

        return { meta, difficulties: parsedDifficulties };
    } catch (e) {
        console.error(`Error parsing ${filePath}:`, e.message);
        return null;
    }
}