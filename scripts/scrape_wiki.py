#!/usr/bin/env python3
"""Scrape Hot Wheels Wiki for car data with image URLs."""

import urllib.request
import urllib.parse
import json
import re
import time
import sys
import hashlib

API = "https://hotwheels.fandom.com/api.php"
YEARS = range(1968, 2027)

def fetch_json(params):
    qs = urllib.parse.urlencode(params)
    url = f"{API}?{qs}"
    req = urllib.request.Request(url, headers={"User-Agent": "DiecastApp/1.0"})
    for attempt in range(3):
        try:
            resp = urllib.request.urlopen(req, timeout=30)
            return json.loads(resp.read())
        except Exception as e:
            if attempt < 2:
                time.sleep(2)
            else:
                print(f"  Failed: {e}", file=sys.stderr)
                return None

def get_fandom_thumb(filename):
    """Construct a Fandom thumbnail URL from filename using MD5 hash."""
    clean = filename.replace(" ", "_")
    md5 = hashlib.md5(clean.encode("utf-8")).hexdigest()
    encoded = urllib.parse.quote(clean)
    return f"https://static.wikia.nocookie.net/hotwheels/images/{md5[0]}/{md5[:2]}/{encoded}/revision/latest/scale-to-width-down/100"

def parse_wikitext(text, year):
    entries = []
    rows = text.split("|-")
    for row in rows:
        cells = [c.strip() for c in row.split("\n|") if c.strip()]
        if len(cells) < 4:
            continue

        name_cell = None
        photo_cell = None
        series_cell = None

        for cell in cells:
            if "[[" in cell and "File:" not in cell and not name_cell:
                m = re.search(r'\[\[([^|\]]+?)(?:\|([^]]+))?\]\]', cell)
                if m:
                    name_cell = m.group(2) or m.group(1)
                    name_cell = re.sub(r"\s*\(.*?\)\s*$", "", name_cell).strip()
                    name_cell = re.sub(r"'''.*?'''", "", name_cell).strip()
                    name_cell = re.sub(r"''+", "", name_cell).strip()
            if "File:" in cell and not photo_cell:
                fm = re.search(r'\[\[File:([^|\]]+)', cell)
                if fm:
                    photo_cell = fm.group(1).strip()
            if "bgcolor" in cell.lower() and "[[" in cell and not series_cell:
                sm = re.search(r'\[\[(?:[^|\]]*\|)?\s*([^]]+?)\]\]', cell)
                if sm:
                    series_cell = sm.group(1).strip()
                    series_cell = re.sub(r"'''.*?'''", "", series_cell).strip()
                    series_cell = re.sub(r"''+", "", series_cell).strip()

        if name_cell and len(name_cell) > 1:
            # Skip color variants
            if "(2nd Color" in name_cell or "(3rd Color" in name_cell or "(4th Color" in name_cell:
                continue
            if "Zamac" in (name_cell or ""):
                continue
            
            entry = {"name": name_cell, "year": str(year), "series": series_cell or ""}
            if photo_cell:
                entry["img"] = get_fandom_thumb(photo_cell)
            entries.append(entry)

    return entries

def main():
    all_entries = []
    seen = set()

    for year in YEARS:
        page = f"List_of_{year}_Hot_Wheels"
        print(f"Fetching {year}...", end=" ", flush=True)

        data = fetch_json({
            "action": "parse",
            "page": page,
            "prop": "wikitext",
            "format": "json",
        })

        if not data or "parse" not in data:
            print("not found")
            continue

        wikitext = data["parse"]["wikitext"]["*"]
        entries = parse_wikitext(wikitext, year)

        new_count = 0
        for e in entries:
            key = f"{e['name']}||{e['year']}"
            if key not in seen:
                seen.add(key)
                all_entries.append(e)
                new_count += 1

        print(f"{new_count} new entries (total: {len(all_entries)})")
        time.sleep(0.5)

    all_entries.sort(key=lambda e: (e["name"].lower(), e.get("year", "")))

    out_path = "src/data/carLookup.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_entries, f, ensure_ascii=False)

    print(f"\nDone! {len(all_entries)} unique entries written to {out_path}")
    
    with_img = sum(1 for e in all_entries if e.get("img"))
    print(f"Entries with images: {with_img}")

if __name__ == "__main__":
    main()
