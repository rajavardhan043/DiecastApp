#!/usr/bin/env python3
"""
Generate a patch file by diffing current wiki data against the bundled dataset.

Usage:
  1. Run scrape_wiki_v2.py first to get the latest data into a temp file
  2. Run this script to produce a patch JSON + updated manifest

Output:
  - diecast-data/patch-vN.json   (new entries only)
  - diecast-data/manifest.json   (version manifest)
"""

import json
import os
import sys
import argparse

BUNDLED = "src/data/carLookup.json"
OUTPUT_DIR = "diecast-data"


def main():
    parser = argparse.ArgumentParser(description="Generate patch from fresh scrape")
    parser.add_argument("fresh_file", help="Path to freshly scraped JSON (from scrape_wiki_v2.py)")
    parser.add_argument("--version", type=int, default=None, help="Patch version number (auto-increments if omitted)")
    args = parser.parse_args()

    with open(BUNDLED, "r", encoding="utf-8") as f:
        bundled = json.load(f)

    with open(args.fresh_file, "r", encoding="utf-8") as f:
        fresh = json.load(f)

    bundled_keys = set(f"{e['name']}||{e.get('year','')}" for e in bundled)
    new_entries = [e for e in fresh if f"{e['name']}||{e.get('year','')}" not in bundled_keys]

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Determine version
    manifest_path = os.path.join(OUTPUT_DIR, "manifest.json")
    if args.version is not None:
        version = args.version
    else:
        try:
            with open(manifest_path) as f:
                old = json.load(f)
            version = old.get("version", 0) + 1
        except FileNotFoundError:
            version = 1

    patch_filename = f"patch-v{version}.json"
    patch_path = os.path.join(OUTPUT_DIR, patch_filename)

    patch = {
        "version": version,
        "entries": new_entries,
    }
    with open(patch_path, "w", encoding="utf-8") as f:
        json.dump(patch, f, ensure_ascii=False, indent=2)

    # Manifest — update YOUR_USERNAME before publishing
    manifest = {
        "version": version,
        "lastYear": max((e.get("year", "0") for e in fresh), default="0"),
        "patchUrl": f"https://raw.githubusercontent.com/rajavardhan043/diecast-collection.github.io/main/{patch_filename}",
    }
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"Bundled entries: {len(bundled)}")
    print(f"Fresh entries:   {len(fresh)}")
    print(f"New entries:     {len(new_entries)}")
    print(f"Patch version:   {version}")
    print(f"Written: {patch_path}")
    print(f"Written: {manifest_path}")
    print()
    if new_entries:
        print("Sample new entries:")
        for e in new_entries[:5]:
            print(f"  {e['name']} ({e.get('year','?')}) - {e.get('series','')}")
    else:
        print("No new entries found — bundled data is up to date.")


if __name__ == "__main__":
    main()
