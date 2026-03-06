/**
 * Hybrid update service for the car lookup dataset.
 *
 * Loads the bundled carLookup.json as a baseline, then checks a remote
 * manifest for patches containing new entries. Patches are cached in
 * localStorage so the app works fully offline after the first fetch.
 */

import bundledData from './data/carLookup.json'

const MANIFEST_URL =
  'https://raw.githubusercontent.com/rajavardhan043/diecast-collection.github.io/main/manifest.json'

const STORAGE_KEY_VERSION = 'diecast_patch_version'
const STORAGE_KEY_PATCH = 'diecast_patch_entries'

let mergedDataCache = null

function getBundledData() {
  return bundledData
}

function getCachedPatch() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PATCH)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function getCachedVersion() {
  return parseInt(localStorage.getItem(STORAGE_KEY_VERSION) || '0', 10)
}

function savePatch(version, entries) {
  try {
    localStorage.setItem(STORAGE_KEY_VERSION, String(version))
    localStorage.setItem(STORAGE_KEY_PATCH, JSON.stringify(entries))
  } catch {}
}

function mergeData(base, patchEntries) {
  if (!patchEntries || patchEntries.length === 0) return base
  const seen = new Set(base.map(e => `${e.name}||${e.year}`))
  const newEntries = patchEntries.filter(e => !seen.has(`${e.name}||${e.year}`))
  return [...base, ...newEntries]
}

export function getMergedLookup() {
  if (mergedDataCache) return mergedDataCache
  const base = getBundledData()
  const patch = getCachedPatch()
  mergedDataCache = mergeData(base, patch)
  return mergedDataCache
}

export async function checkForUpdates() {
  try {
    const resp = await fetch(MANIFEST_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!resp.ok) return { updated: false, count: 0 }

    const manifest = await resp.json()
    const remoteVersion = manifest.version || 0
    const localVersion = getCachedVersion()

    if (remoteVersion <= localVersion) return { updated: false, count: 0 }

    const entries = manifest.entries || []
    if (entries.length === 0) return { updated: false, count: 0 }

    savePatch(remoteVersion, entries)
    mergedDataCache = null
    return { updated: true, count: entries.length }
  } catch {
    return { updated: false, count: 0, error: true }
  }
}
