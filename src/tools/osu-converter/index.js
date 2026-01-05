import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { parseOsuFile } from './parser.js';
import { convertToRtm } from './mapper.js';
import JSZip from 'jszip';

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log("Usage: node src/tools/osu-converter/index.js <path-to-osu-file>");
        process.exit(1);
    }

    const inputFile = args[0];
    const inputDir = path.dirname(inputFile);
    
    console.log(chalk.cyan(`📂 Processing: ${path.basename(inputFile)}`));
    
    // 1. Parse
    const osuData = await parseOsuFile(inputFile);
    console.log(chalk.blue(`   Found ${osuData.HitObjects.length} objects`));

    // 2. Convert
    const rtmData = convertToRtm(osuData);
    console.log(chalk.green(`   Converted to ${rtmData.notes.length} RTM notes`));

    // 3. Package
    const zip = new JSZip();

    // Meta.json
    const meta = {
        mapsetId: rtmData.mapsetId,
        songName: osuData.Metadata.Title,
        artistName: osuData.Metadata.Artist,
        mapper: osuData.Metadata.Creator,
        bpm: 0, // Should calc from TimingPoints
        offset: 0,
        audioFile: osuData.General.AudioFilename,
        backgroundFiles: [], // Should parse Events
        difficulties: [
            {
                diffId: rtmData.diffId,
                name: rtmData.name,
                filename: `${rtmData.diffId}.rtm.json`
            }
        ]
    };
    
    // Audio Copy
    try {
        const audioData = await fs.readFile(path.join(inputDir, osuData.General.AudioFilename));
        zip.file(osuData.General.AudioFilename, audioData);
    } catch (e) {
        console.warn(chalk.yellow(`   ⚠️  Missing Audio: ${osuData.General.AudioFilename}`));
    }

    zip.file('meta.json', JSON.stringify(meta, null, 2));
    zip.file(`${rtmData.diffId}.rtm.json`, JSON.stringify(rtmData, null, 2));

    // 4. Save
    const outName = `${osuData.Metadata.Artist} - ${osuData.Metadata.Title} [${osuData.Metadata.Version}].rtm`.replace(/[^a-z0-9 \-\[\]\.]/gi, '_');
    const outPath = path.resolve(process.cwd(), 'songs', outName);
    
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    
    const content = await zip.generateAsync({ type: 'nodebuffer' });
    await fs.writeFile(outPath, content);
    
    console.log(chalk.bold.green(`✅ Saved: ${outPath}`));
}

main().catch(console.error);