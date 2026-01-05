import fs from 'fs/promises';
import path from 'path';

export async function parseOsuFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('//'));

    const data = {
        Metadata: {},
        General: {},
        Difficulty: {},
        HitObjects: [],
        TimingPoints: []
    };

    let section = null;

    for (const line of lines) {
        if (line.startsWith('[') && line.endsWith(']')) {
            section = line.slice(1, -1);
            continue;
        }

        if (section === 'Metadata' || section === 'General' || section === 'Difficulty') {
            const [key, ...rest] = line.split(':');
            if (key && rest.length > 0) {
                data[section][key.trim()] = rest.join(':').trim();
            }
        } 
        else if (section === 'TimingPoints') {
            const parts = line.split(',');
            data.TimingPoints.push({
                time: parseFloat(parts[0]),
                beatLength: parseFloat(parts[1]),
                meter: parseInt(parts[2]),
                sampleSet: parseInt(parts[3]),
                sampleIndex: parseInt(parts[4]),
                volume: parseInt(parts[5]),
                uninherited: parts[6] === '1',
                effects: parseInt(parts[7])
            });
        }
        else if (section === 'HitObjects') {
            const parts = line.split(',');
            const x = parseInt(parts[0]);
            const y = parseInt(parts[1]); // Unused in mania usually
            const time = parseInt(parts[2]);
            const type = parseInt(parts[3]);
            const hitSound = parseInt(parts[4]);
            
            // Mania Column Calculation (KeyCount=7)
            // col = floor(x * columnCount / 512)
            // We assume 7K for this specific converter logic
            const column = Math.floor(x * 7 / 512);

            let endTime = time;
            // Check for Hold Note (Type & 128)
            if ((type & 128) > 0) {
                const endParts = parts[5].split(':');
                endTime = parseInt(endParts[0]);
            }

            data.HitObjects.push({
                time,
                column,
                type: (type & 128) > 0 ? 'hold' : 'tap',
                endTime,
                hitSound
            });
        }
    }
    
    // Sort by time just in case
    data.HitObjects.sort((a, b) => a.time - b.time);

    return data;
}