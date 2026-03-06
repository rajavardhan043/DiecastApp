#!/usr/bin/env node
/**
 * Syncs carLookup.json with entries from the remote manifest.
 * Used by the sync-car-lookup GitHub Action when data repo is updated.
 */

import fs from 'fs';
import https from 'https';

const MANIFEST_URL = 'https://raw.githubusercontent.com/rajavardhan043/diecast-collection.github.io/main/manifest.json';
const CARLOOKUP_PATH = 'src/data/carLookup.json';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const manifest = await fetchJson(MANIFEST_URL);
  const entries = manifest.entries || [];
  if (entries.length === 0) {
    console.log('No patch entries in manifest. Nothing to sync.');
    process.exit(0);
  }

  const carLookup = JSON.parse(fs.readFileSync(CARLOOKUP_PATH, 'utf8'));
  const seen = new Set(carLookup.map((e) => `${e.name}||${e.year || ''}`));
  const toAdd = entries.filter((e) => !seen.has(`${e.name}||${e.year || ''}`));

  if (toAdd.length === 0) {
    console.log('carLookup.json is already up to date.');
    process.exit(0);
  }

  carLookup.push(...toAdd);
  carLookup.sort((a, b) => {
    const na = (a.name || '').toLowerCase();
    const nb = (b.name || '').toLowerCase();
    if (na !== nb) return na.localeCompare(nb);
    return (a.year || '').localeCompare(b.year || '');
  });

  fs.writeFileSync(CARLOOKUP_PATH, JSON.stringify(carLookup, null, 2), 'utf8');
  console.log(`Added ${toAdd.length} entries to carLookup.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
