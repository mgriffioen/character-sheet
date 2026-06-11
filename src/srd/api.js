// Client for the free D&D 5e SRD API (https://www.dnd5eapi.co) — no key, open
// CORS, SRD content only. Lists and details are cached in memory and in
// localStorage so the compendium is fast and keeps working offline after the
// first load. The network fetch is `globalThis.fetch`, which tests can stub.

const ROOT = 'https://www.dnd5eapi.co'
const LIST_TTL = 1000 * 60 * 60 * 24 * 7 // 7 days

// Categories surfaced in the compendium. `addable` marks what can be added to
// a character ('spell' -> Spells, 'item' -> Inventory); others are reference.
export const SRD_CATEGORIES = [
  { key: 'spells', label: 'Spells', path: 'spells', addable: 'spell' },
  { key: 'equipment', label: 'Equipment', path: 'equipment', addable: 'item' },
  { key: 'magic-items', label: 'Magic Items', path: 'magic-items', addable: 'item' },
  { key: 'conditions', label: 'Conditions', path: 'conditions' },
  { key: 'rule-sections', label: 'Rules', path: 'rule-sections' },
]

async function fetchJson(url) {
  let res
  try {
    res = await fetch(url)
  } catch {
    throw new Error('Could not reach the SRD library — check your connection.')
  }
  if (!res.ok) throw new Error(`SRD request failed (${res.status}).`)
  return res.json()
}

function lsGet(key) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}
function lsSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* storage full / unavailable — caching is best-effort */
  }
}

const memList = new Map()
const memDetail = new Map()

// Fetch a category index, e.g. srdList('spells') -> [{index,name,url}, ...].
export async function srdList(path) {
  if (memList.has(path)) return memList.get(path)
  const cacheKey = `srd:list:${path}`
  const cached = lsGet(cacheKey)
  if (cached && Date.now() - cached.ts < LIST_TTL && Array.isArray(cached.results)) {
    memList.set(path, cached.results)
    return cached.results
  }
  const data = await fetchJson(`${ROOT}/api/${path}`)
  const results = data.results || []
  memList.set(path, results)
  lsSet(cacheKey, { ts: Date.now(), results })
  return results
}

// Fetch a single entry by its API url (e.g. "/api/spells/fireball").
export async function srdDetail(url) {
  if (memDetail.has(url)) return memDetail.get(url)
  const cacheKey = `srd:detail:${url}`
  const cached = lsGet(cacheKey)
  if (cached) {
    memDetail.set(url, cached)
    return cached
  }
  const data = await fetchJson(`${ROOT}${url}`)
  memDetail.set(url, data)
  lsSet(cacheKey, data)
  return data
}

// Test/maintenance helper.
export function _clearSrdMemoryCache() {
  memList.clear()
  memDetail.clear()
}
