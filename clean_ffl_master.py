#!/usr/bin/env python3
"""
Clean ffl_master.csv:
1. Remove rows for states that ban suppressors (CA, NY, IL, NJ, MA, CT, RI, HI)
2. Remove DC, PR, GU, MH, VI
3. Pad all ZIP codes to 5 digits (add leading zeros, strip +4)
"""

import csv
import re

INPUT = '/home/dubdub/DubDubSuppressor/ffl_master.csv'
OUTPUT = '/home/dubdub/DubDubSuppressor/ffl_master_cleaned.csv'

BAN_STATES = {'CA', 'NY', 'IL', 'NJ', 'MA', 'CT', 'RI', 'HI'}
REMOVE_TERRITORORIES = {'DC', 'PR', 'GU', 'MH', 'VI'}
REMOVE = BAN_STATES | REMOVE_TERRITORORIES

def pad_zip(raw):
    raw = raw.strip()
    # Strip +4 suffix if present
    raw = re.sub(r'\+.*', '', raw)
    # Remove any non-digit characters (safety)
    raw = re.sub(r'\D', '', raw)
    # Pad to 5 digits with leading zeros
    return raw.zfill(5)

count_removed = 0
count_kept = 0
zip_fixes = 0

with open(INPUT, 'r', newline='', encoding='utf-8') as fin, \
     open(OUTPUT, 'w', newline='', encoding='utf-8') as fout:

    reader = csv.DictReader(fin)
    writer = None  # defer until we confirm fieldnames

    for row in reader:
        state = row.get('PREMISE_STATE', '').strip()

        if state in REMOVE:
            count_removed += 1
            continue

        # Pad ZIP
        original_zip = row.get('PREMISE_ZIP_CODE', '')
        padded = pad_zip(original_zip)
        if padded != original_zip:
            zip_fixes += 1
        row['PREMISE_ZIP_CODE'] = padded

        count_kept += 1

        if writer is None:
            writer = csv.DictWriter(fout, fieldnames=reader.fieldnames)
            writer.writeheader()

        writer.writerow(row)

print(f"Rows removed: {count_removed}")
print(f"Rows kept:    {count_kept}")
print(f"ZIP fixes:    {zip_fixes}")
print(f"Output:       {OUTPUT}")
