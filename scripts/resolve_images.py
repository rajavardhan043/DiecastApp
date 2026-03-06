#!/usr/bin/env python3
"""Resolve image filenames to actual Fandom CDN thumbnail URLs via the MediaWiki API."""

import urllib.request
import urllib.parse
import json
import ssl
import time
import sys

API = "https://hotwheels.fandom.com/api.php"

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

def extract_filename(url):
    """Extract the original filename from a constructed URL."""
    # URL format: .../images/x/xx/FILENAME/revision/...
    parts = url.split("/images/")
    if len(parts) < 2:
        return None
    rest = parts[1]
    segs = rest.split("/")
    if len(segs) >= 3:
        return urllib.parse.unquote(segs[2])
    return None

def batch_resolve(filenames):
    """Resolve up to 50 filenames to their actual thumbnail URLs."""
    titles = "|".join(f"File:{fn}" for fn in filenames)
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
    for pid, page in pages.items():
        title = page.get("title", "")
        if title.startswith("File:"):
            fn = title[5:]
            ii = page.get("imageinfo", [{}])
            if ii:
                thumb = ii[0].get("thumburl", "")
                if thumb:
                    result[fn] = thumb
    return result

def main():
    with open("src/data/carLookup.json", "r", encoding="utf-8") as f:
        entries = json.load(f)

    # Collect all entries that have img URLs and extract filenames
    to_resolve = []
    for i, entry in enumerate(entries):
        if entry.get("img"):
            fn = extract_filename(entry["img"])
            if fn:
                to_resolve.append((i, fn))

    print(f"Need to resolve {len(to_resolve)} image URLs")

    # Batch resolve in groups of 50
    resolved = {}
    batch_size = 50
    for start in range(0, len(to_resolve), batch_size):
        batch = to_resolve[start:start + batch_size]
        filenames = [fn for _, fn in batch]
        
        pct = (start / len(to_resolve)) * 100
        print(f"  Batch {start//batch_size + 1}/{(len(to_resolve) + batch_size - 1)//batch_size} ({pct:.0f}%)...", end=" ", flush=True)
        
        urls = batch_resolve(filenames)
        resolved.update(urls)
        print(f"{len(urls)} resolved")
        
        time.sleep(0.3)

    # Update entries with resolved URLs
    updated = 0
    for i, fn in to_resolve:
        if fn in resolved:
            entries[i]["img"] = resolved[fn]
            updated += 1
        else:
            # Remove broken img reference
            del entries[i]["img"]

    # Save
    with open("src/data/carLookup.json", "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False)

    print(f"\nDone! Updated {updated} image URLs out of {len(to_resolve)}")
    
    # Show sample
    samples = [e for e in entries if e.get("img")][:3]
    for s in samples:
        print(f"  {s['name']}: {s['img'][:80]}...")

if __name__ == "__main__":
    main()
