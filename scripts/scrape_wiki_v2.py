#!/usr/bin/env python3
"""Scrape Hot Wheels Wiki v2: get car data + resolve image URLs via API."""

import urllib.request
import urllib.parse
import json
import re
import time
import sys
import ssl

API = "https://hotwheels.fandom.com/api.php"
YEARS = range(1968, 2027)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch_json(params):
    qs = urllib.parse.urlencode(params)
    url = f"{API}?{qs}"
    req = urllib.request.Request(url, headers={"User-Agent": "DiecastApp/1.0"})
    for attempt in range(3):
        try:
            resp = urllib.request.urlopen(req, timeout=30, context=ctx)
            return json.loads(resp.read())
        except Exception as e:
            if attempt < 2:
                time.sleep(2)
            else:
                print(f"  Failed: {e}", file=sys.stderr)
                return None

def batch_resolve_images(filenames):
    """Resolve up to 50 filenames to their actual thumbnail URLs."""
    if not filenames:
        return {}
    titles = "|".join(f"File:{fn}" for fn in filenames[:50])
    data = fetch_json({
        "action": "query",
        "titles": titles,
        "prop": "imageinfo",
        "iiprop": "url",
        "iiurlwidth": 100,
        "format": "json",
    })
    if not data:
        return {}
    result = {}
    pages = data.get("query", {}).get("pages", {})
    normalized = {}
    for n in data.get("query", {}).get("normalized", []):
        normalized[n["to"]] = n["from"]
    for pid, page in pages.items():
        title = page.get("title", "")
        if title.startswith("File:"):
            fn = title[5:]
            ii = page.get("imageinfo", [{}])
            if ii:
                thumb = ii[0].get("thumburl", "")
                if thumb:
                    result[fn] = thumb
                    orig_title = normalized.get(title, title)
                    if orig_title.startswith("File:"):
                        orig_fn = orig_title[5:]
                        if orig_fn != fn:
                            result[orig_fn] = thumb
    return result

def parse_wikitext(text, year):
    """Parse wikitext and return entries with raw image filenames."""
    entries = []
    rows = text.split("|-")
    for row in rows:
        cells = [c.strip() for c in row.split("\n|") if c.strip()]
        if len(cells) < 4:
            continue

        name_cell = None
        photo_filename = None
        series_cell = None

        for cell in cells:
            if "[[" in cell and "File:" not in cell and not name_cell:
                m = re.search(r'\[\[([^|\]]+?)(?:\|([^]]+))?\]\]', cell)
                if m:
                    name_cell = m.group(2) or m.group(1)
                    name_cell = re.sub(r"\s*\(.*?\)\s*$", "", name_cell).strip()
                    name_cell = re.sub(r"'''.*?'''", "", name_cell).strip()
                    name_cell = re.sub(r"''+", "", name_cell).strip()
                    name_cell = re.sub(r'<[^>]+>', '', name_cell).strip()
            if "File:" in cell and not photo_filename:
                fm = re.search(r'\[\[File:([^|\]]+)', cell)
                if fm:
                    photo_filename = fm.group(1).strip()
            if "bgcolor" in cell.lower() and "[[" in cell and not series_cell:
                sm = re.search(r'\[\[(?:[^|\]]*\|)?\s*([^]]+?)\]\]', cell)
                if sm:
                    series_cell = sm.group(1).strip()
                    series_cell = re.sub(r"'''.*?'''", "", series_cell).strip()
                    series_cell = re.sub(r"''+", "", series_cell).strip()
                    series_cell = re.sub(r'<[^>]+>', '', series_cell).strip()
                    series_cell = re.sub(r'\s*Mini Collection\s*\(\d+\)\s*$', '', series_cell).strip()

        if name_cell and len(name_cell) > 1:
            if re.search(r'\((?:2nd|3rd|4th|5th)\s+Color', name_cell):
                continue
            if "Zamac" in (name_cell or ""):
                continue
            entries.append({
                "name": name_cell,
                "year": str(year),
                "series": series_cell or "",
                "_filename": photo_filename,
            })
    return entries


def main():
    all_entries = []
    seen = set()
    pending_images = {}  # filename -> list of entry indices

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
                idx = len(all_entries)
                fn = e.pop("_filename", None)
                all_entries.append(e)
                if fn:
                    pending_images.setdefault(fn, []).append(idx)
                new_count += 1

        print(f"{new_count} entries")
        time.sleep(0.3)

    print(f"\nTotal entries: {len(all_entries)}")
    print(f"Unique image filenames to resolve: {len(pending_images)}")

    # Batch resolve all image filenames
    filenames = list(pending_images.keys())
    resolved = {}
    batch_size = 50
    total_batches = (len(filenames) + batch_size - 1) // batch_size

    for start in range(0, len(filenames), batch_size):
        batch = filenames[start:start + batch_size]
        batch_num = start // batch_size + 1
        pct = (start / len(filenames)) * 100
        print(f"  Resolving batch {batch_num}/{total_batches} ({pct:.0f}%)...", end=" ", flush=True)

        urls = batch_resolve_images(batch)
        resolved.update(urls)
        found = sum(1 for fn in batch if fn in urls)
        print(f"{found}/{len(batch)}")
        time.sleep(0.2)

    # Apply resolved URLs to entries
    img_count = 0
    for fn, indices in pending_images.items():
        url = resolved.get(fn)
        if url:
            for idx in indices:
                all_entries[idx]["img"] = url
                img_count += 1

    all_entries.sort(key=lambda e: (e["name"].lower(), e.get("year", "")))

    out_path = "src/data/carLookup.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_entries, f, ensure_ascii=False)

    print(f"\nDone! {len(all_entries)} entries, {img_count} with images")
    print(f"Written to {out_path}")

    # Show samples
    samples = [e for e in all_entries if e.get("img")][:3]
    for s in samples:
        print(f"  {s['name']} ({s['year']}): {s['img'][:90]}...")

if __name__ == "__main__":
    main()
