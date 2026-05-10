const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function extractPDF() {
    const pdfPath = path.resolve(__dirname, '../LATSAR/CPNS PELATIHAN DASAR (LATSAR) 2024.pdf');
    console.log('Reading PDF:', pdfPath);
    
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    
    const rawText = data.text;
    fs.writeFileSync(path.resolve(__dirname, 'raw_text.txt'), rawText, 'utf8');
    console.log(`Pages: ${data.numpages} | Characters: ${rawText.length}`);
    
    parseParticipants(rawText);
}

function parseParticipants(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const romanMap = {
        'I':1,'II':2,'III':3,'IV':4,'V':5,'VI':6,'VII':7,'VIII':8,'IX':9,'X':10,
        'XI':11,'XII':12,'XIII':13,'XIV':14,'XV':15,'XVI':16,'XVII':17,'XVIII':18,
        'XIX':19,'XX':20,'XXI':21,'XXII':22,'XXIII':23,'XXIV':24,'XXV':25,'XXVI':26
    };

    function getGelombang(ang) {
        if (ang <= 2) return 1;
        if (ang <= 5) return 2;
        if (ang <= 10) return 3;
        if (ang <= 14) return 4;
        if (ang <= 18) return 5;
        if (ang <= 22) return 6;
        return 7;
    }

    const participants = [];
    const nipSet = new Set();
    let currentAngkatan = 1;

    const nipPattern = /(\d{8})\s*(\d{6})\s*(\d)\s*(\d{3})/;
    const angkatanPattern = /ANGKATAN\s+.*?\(([IVX]+)\)/i;
    const skipWords = /^(NO|NAMA|NIP|PANGKAT|GOLONGAN|GEL|ANGKATAN|HALAMAN|PAGE|LATSAR|CPNS|BKPSDM|PROVINSI|PAPUA)$/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detect angkatan change
        const angMatch = line.match(angkatanPattern);
        if (angMatch) {
            const roman = angMatch[1].toUpperCase();
            if (romanMap[roman]) {
                currentAngkatan = romanMap[roman];
                console.log(`  → Angkatan ${currentAngkatan}`);
            }
            continue;
        }

        // Detect NIP (18 digits with optional spaces)
        const nipMatch = line.match(nipPattern);
        if (!nipMatch) continue;

        const nip = `${nipMatch[1]} ${nipMatch[2]} ${nipMatch[3]} ${nipMatch[4]}`;
        const cleanNip = nip.replace(/\s+/g, '');
        if (nipSet.has(cleanNip)) continue;

        // Name = text before the first digit of NIP
        const nipIndex = line.search(/\d{8}/);
        let name = line.substring(0, nipIndex).trim();
        name = name.replace(/^\d+[\.\)\s]*/, '').trim();

        // If name is empty, check previous line
        if (!name && i > 0) {
            const prev = lines[i - 1].replace(/^\d+[\.\)\s]*/, '').trim();
            if (prev.length > 2 && !skipWords.test(prev) && !prev.match(/\d{18}/)) {
                name = prev;
            }
        }

        // Golongan = text after the 18 digits of NIP
        // The NIP match might contain spaces, so find where it ends
        const fullNipMatch = nipMatch[0];
        const afterNip = line.substring(line.indexOf(fullNipMatch) + fullNipMatch.length).trim();
        
        let golongan = 'PENATA MUDA III/a';
        const golMatch = (afterNip + line).match(/(PENATA MUDA TINGKAT I|PENATA MUDA|PENATA TINGKAT I|PENATA|PENGATUR MUDA TINGKAT I|PENGATUR MUDA|PENGATUR TINGKAT I|PENGATUR)/i);
        if (golMatch) {
            golongan = golMatch[0].trim().toUpperCase();
            const gradeMatch = (afterNip + line).match(/(III\/[ab]|II\/[abcd])/i);
            if (gradeMatch) golongan += ' ' + gradeMatch[1].toUpperCase();
        }

        if (name && name.length > 2 && !skipWords.test(name)) {
            nipSet.add(cleanNip);
            participants.push([name, nip, golongan, getGelombang(currentAngkatan), currentAngkatan]);
        }
    }

    console.log(`\n✅ Extracted ${participants.length} unique participants`);
    console.log('\nSample (first 10):');
    participants.slice(0, 10).forEach((p, i) => {
        console.log(`  ${i+1}. ${p[0]} | ${p[1]} | Ang:${p[4]} Gel:${p[3]}`);
    });

    const outPath = path.resolve(__dirname, '../server/participants.json');
    fs.writeFileSync(outPath, JSON.stringify(participants, null, 2), 'utf8');
    console.log(`\n✅ Saved to server/participants.json`);
}

extractPDF().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
