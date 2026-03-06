#!/usr/bin/env python3
"""Download all thumbnail images locally for offline use."""

import urllib.request
import json
import os
import ssl
import time
import sys
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

THUMB_DIR = "public/thumbs"
LOOKUP_FILE = "src/data/carLookup.json"

def download_one(idx, url):
    """Download a single thumbnail. Returns (idx, local_filename) or (idx, None)."""
    # Use smaller 48px thumbnails to save space
    small_url = url.replace("/scale-to-width-down/100", "/scale-to-width-down/48")
    
    ext = "jpg"
    if ".png" in url.lower():
        ext = "png"
    elif ".gif" in url.lower():
        ext = "gif"
    
    filename = f"{idx}.{ext}"
    filepath = os.path.join(THUMB_DIR, filename)
    
    if os.path.exists(filepath) and os.path.getsize(filepath) > 100:
        return (idx, filename)
    
    req = urllib.request.Request(small_url, headers={
        "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
    })
    
    for attempt in range(2):
        try:
            resp = urllib.request.urlopen(req, timeout=15, context=ctx)
            data = resp.read()
            if len(data) < 100:
                return (idx, None)
            
            content_type = resp.headers.get("Content-Type", "")
            if "webp" in content_type:
                filename = f"{idx}.webp"
                filepath = os.path.join(THUMB_DIR, filename)
            elif "png" in content_type:
                filename = f"{idx}.png"
                filepath = os.path.join(THUMB_DIR, filename)
            
            with open(filepath, "wb") as f:
                f.write(data)
            return (idx, filename)
        except Exception as e:
            if attempt == 0:
                time.sleep(0.5)
    
    return (idx, None)


def main():
    with open(LOOKUP_FILE, "r", encoding="utf-8") as f:
        entries = json.load(f)
    
    to_download = [(i, e["img"]) for i, e in enumerate(entries) if e.get("img")]
    print(f"Total entries: {len(entries)}, with images: {len(to_download)}")
    
    # Check already downloaded
    existing = set(os.listdir(THUMB_DIR))
    already = 0
    for i, url in to_download:
        for ext in ["jpg", "png", "webp", "gif"]:
            if f"{i}.{ext}" in existing:
                already += 1
                break
    print(f"Already downloaded: {already}")
    
    downloaded = 0
    failed = 0
    
    # Use thread pool for parallel downloads (8 threads)
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(download_one, i, url): i for i, url in to_download}
        
        for count, future in enumerate(as_completed(futures), 1):
            idx, filename = future.result()
            if filename:
                entries[idx]["img"] = f"/thumbs/{filename}"
                downloaded += 1
            else:
                if "img" in entries[idx]:
                    del entries[idx]["img"]
                failed += 1
            
            if count % 100 == 0:
                pct = (count / len(to_download)) * 100
                print(f"  Progress: {count}/{len(to_download)} ({pct:.0f}%) - {downloaded} ok, {failed} failed")
    
    # Save updated lookup
    with open(LOOKUP_FILE, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False)
    
    # Calculate total size
    total_size = sum(
        os.path.getsize(os.path.join(THUMB_DIR, f))
        for f in os.listdir(THUMB_DIR)
        if os.path.isfile(os.path.join(THUMB_DIR, f))
    )
    
    print(f"\nDone! Downloaded: {downloaded}, Failed: {failed}")
    print(f"Total thumbs size: {total_size / 1024 / 1024:.1f} MB")
    print(f"Updated {LOOKUP_FILE}")


if __name__ == "__main__":
    main()
