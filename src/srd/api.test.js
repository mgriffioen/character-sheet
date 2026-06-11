import { test } from 'node:test'
import assert from 'node:assert/strict'

import { srdList, srdDetail, _clearSrdMemoryCache } from './api.js'

function setup() {
  const store = {}
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v)
    },
    removeItem: (k) => {
      delete store[k]
    },
  }
  _clearSrdMemoryCache()
}

const jsonRes = (obj) => ({ ok: true, status: 200, json: async () => obj })

test('srdList fetches once and caches the result', async () => {
  setup()
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    return jsonRes({ count: 1, results: [{ index: 'fireball', name: 'Fireball', url: '/api/spells/fireball' }] })
  }
  const a = await srdList('spells')
  const b = await srdList('spells')
  assert.equal(calls, 1)
  assert.equal(a.length, 1)
  assert.equal(b[0].name, 'Fireball')
})

test('srdDetail fetches by url and caches', async () => {
  setup()
  let calls = 0
  globalThis.fetch = async (url) => {
    calls++
    assert.ok(String(url).endsWith('/api/spells/fireball'))
    return jsonRes({ index: 'fireball', name: 'Fireball', level: 3 })
  }
  const d = await srdDetail('/api/spells/fireball')
  await srdDetail('/api/spells/fireball')
  assert.equal(calls, 1)
  assert.equal(d.level, 3)
})

test('srdList throws on HTTP error', async () => {
  setup()
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) })
  await assert.rejects(() => srdList('equipment'), /500/)
})

test('srdList gives a friendly error on network failure', async () => {
  setup()
  globalThis.fetch = async () => {
    throw new Error('network down')
  }
  await assert.rejects(() => srdList('magic-items'), /check your connection/)
})
