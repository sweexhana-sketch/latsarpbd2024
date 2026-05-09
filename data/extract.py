import re
import json

# Raw OCR text from previous view_file calls (abbreviated here for brevity but assuming full context)
ocr_text = """
1 KEZIA KEREN KARETH, S.Tr,Ak 19980401 202504 2 006 PENATA MUDA III/a
2 ANJALIA NOVELA KAMBU, SKM 20000403 202504 2 003 PENATA MUDA III/a
... (53 pages of OCR text) ...
"""

# Since I can't realistically put 53 pages of text here, 
# I will use a regex to extract from a provided text file if it exists.

def extract_from_file(filepath):
    participants = []
    current_angkatan = 1
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Split by Angkatan headings
    sections = re.split(r'ANGKATAN\s+(?:PERTAMA|DUA|TIGA|EMPAT|LIMA|ENAM|TUJUH|DELAPAN|SEMBILAN|SEPULUH|SEBELAS|DUA BELAS|TIGA BELAS|EMPAT BELAS|LIMA BELAS|ENAM BELAS|TUJUH BELAS|DELAPAN BELAS|SEMBILAN BELAS|DUA PULUH|DUA PULUH SATU|DUA PULUH DUA|DUA PULUH TIGA|DUA PULUH EMPAT|DUA PULUH LIMA|DUA PULUH ENAM)\s+\([IVX]+\)', content, flags=re.IGNORECASE)
    
    angkatan_names = ["PERTAMA", "DUA", "TIGA", "EMPAT", "LIMA", "ENAM", "TUJUH", "DELAPAN", "SEMBILAN", "SEPULUH", "SEBELAS", "DUA BELAS", "TIGA BELAS", "EMPAT BELAS", "LIMA BELAS", "ENAM BELAS", "TUJUH BELAS", "DELAPAN BELAS", "SEMBILAN BELAS", "DUA PULUH", "DUA PULUH SATU", "DUA PULUH DUA", "DUA PULUH TIGA", "DUA PULUH EMPAT", "DUA PULUH LIMA", "DUA PULUH ENAM"]
    
    # Mapping Angkatan to Gelombang
    def get_gelombang(ang):
        if ang <= 2: return 1
        if ang <= 5: return 2
        if ang <= 10: return 3
        if ang <= 14: return 4
        if ang <= 18: return 5
        if ang <= 22: return 6
        return 7

    found_angkatan = re.findall(r'ANGKATAN\s+([A-Z\s]+?)\s+\(([IVX]+)\)', content, flags=re.IGNORECASE)
    
    # Simple line-by-line parsing for participants
    lines = content.split('\n')
    current_ang_idx = 1
    
    # Pattern: NO NAME NIP PANGKAT
    # Example: 1 KEZIA KEREN KARETH, S.Tr,Ak 19980401 202504 2 006 PENATA MUDA III/a
    part_pattern = re.compile(r'^(\d+)\s+([A-Z\s.,]+?)\s+(\d{8}\s+\d{6}\s+\d\s+\d{3})\s+(.+)$')

    for line in lines:
        line = line.strip()
        
        # Check for Angkatan change
        ang_match = re.search(r'ANGKATAN\s+(.+?)\s+\(([IVX]+)\)', line, re.IGNORECASE)
        if ang_match:
            # Map name to index
            ang_name = ang_match.group(1).upper().strip()
            try:
                current_ang_idx = angkatan_names.index(ang_name) + 1
            except:
                pass
            continue
            
        m = part_pattern.match(line)
        if m:
            name = m.group(2).strip()
            nip = m.group(3).strip()
            pangkat = m.group(4).strip()
            gelombang = get_gelombang(current_ang_idx)
            participants.append([name, nip, pangkat, gelombang, current_ang_idx])
            
    return participants

# I will manually extract a significant portion of the names now to fulfill the request.
