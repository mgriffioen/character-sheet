import { test } from 'node:test'
import assert from 'node:assert/strict'

import { srdSpellToModel, srdItemToModel, srdFeatureToModel, open5eFeatToModel, subclassFeatureModels } from './adapters.js'
import { _clearSrdMemoryCache } from './api.js'

const jsonRes = (obj) => ({ ok: true, status: 200, json: async () => obj })

const fireball = {
  index: 'fireball',
  name: 'Fireball',
  level: 3,
  desc: ['A bright streak flashes from your pointing finger.'],
  higher_level: ['The damage increases by 1d6 for each slot above 3rd.'],
  range: '150 feet',
  components: ['V', 'S', 'M'],
  material: 'A tiny ball of bat guano and sulfur.',
  ritual: false,
  duration: 'Instantaneous',
  concentration: false,
  casting_time: '1 action',
  school: { index: 'evocation', name: 'Evocation' },
}

test('srdSpellToModel maps an SRD spell', () => {
  const m = srdSpellToModel(fireball, 'int')
  assert.equal(m.name, 'Fireball')
  assert.equal(m.level, 3)
  assert.equal(m.school, 'Evocation')
  assert.equal(m.castingTime, '1 action')
  assert.equal(m.range, '150 feet')
  assert.equal(m.components, 'V, S, M')
  assert.equal(m.materials, 'A tiny ball of bat guano and sulfur.')
  assert.equal(m.ability, 'int')
  assert.equal(m.source, 'SRD')
  assert.ok(m.description.includes('At Higher Levels:'))
})

test('srdItemToModel maps a weapon', () => {
  const longsword = {
    index: 'longsword',
    name: 'Longsword',
    equipment_category: { index: 'weapon', name: 'Weapon' },
    damage: { damage_dice: '1d8', damage_type: { name: 'Slashing' } },
    weight: 3,
    desc: [],
  }
  const m = srdItemToModel(longsword)
  assert.equal(m.name, 'Longsword')
  assert.equal(m.type, 'Weapon')
  assert.equal(m.weight, 3)
  assert.equal(m.rarity, null)
  assert.equal(m.magic, false)
  assert.equal(m.equipped, false)
})

test('srdFeatureToModel maps a class feature', () => {
  const m = srdFeatureToModel({ name: 'Rage', class: { name: 'Barbarian' }, level: 1, desc: ['In battle you fight with primal ferocity.'] })
  assert.equal(m.name, 'Rage')
  assert.equal(m.source, 'Barbarian')
  assert.equal(m.level, 1)
  assert.ok(m.description.includes('primal ferocity'))
})

test('open5eFeatToModel maps a feat with prerequisite', () => {
  const m = open5eFeatToModel({ name: 'Sharpshooter', prerequisite: 'Dexterity 13', desc: 'You have mastered ranged weapons.' })
  assert.equal(m.name, 'Sharpshooter')
  assert.equal(m.source, 'Feat')
  assert.ok(m.description.includes('Prerequisite: Dexterity 13'))
  assert.ok(m.description.includes('mastered ranged'))
})

test('subclassFeatureModels enriches features with descriptions, honoring maxLevel', async () => {
  globalThis.localStorage = undefined // exercise the no-storage path (caching is best-effort)
  _clearSrdMemoryCache()
  const levels = [
    { level: 3, features: [{ index: 'cutting-words', name: 'Cutting Words', url: '/api/features/cutting-words' }] },
    { level: 6, features: [{ index: 'magical-secrets', name: 'Additional Magical Secrets', url: '/api/features/magical-secrets' }] },
  ]
  const detail = { '/api/features/cutting-words': { desc: ['You learn to twist a creature’s own words against it.'] } }
  const fetched = []
  globalThis.fetch = async (url) => {
    const path = String(url).replace(/^https?:\/\/[^/]+/, '')
    fetched.push(path)
    if (path.endsWith('/api/subclasses/lore/levels')) return jsonRes(levels)
    if (detail[path]) return jsonRes(detail[path])
    throw new Error(`unexpected url ${path}`)
  }

  const feats = await subclassFeatureModels('lore', 'College of Lore', 5)

  assert.equal(feats.length, 1) // the level-6 feature is excluded at maxLevel 5
  assert.equal(feats[0].name, 'Cutting Words')
  assert.equal(feats[0].source, 'College of Lore')
  assert.equal(feats[0].level, 3)
  assert.ok(feats[0].description.includes('twist'))
  assert.ok(feats[0].id) // gets a real id, not name-only
  assert.ok(!fetched.includes('/api/features/magical-secrets')) // never fetched beyond maxLevel
})

test('srdItemToModel maps a magic item with rarity', () => {
  const cloak = {
    index: 'cloak-of-protection',
    name: 'Cloak of Protection',
    equipment_category: { index: 'wondrous-items', name: 'Wondrous Items' },
    rarity: { name: 'Uncommon' },
    desc: ['You gain a +1 bonus to AC and saving throws while you wear this cloak.'],
  }
  const m = srdItemToModel(cloak)
  assert.equal(m.type, 'Wondrous Items')
  assert.equal(m.rarity, 'Uncommon')
  assert.equal(m.magic, true)
  assert.ok(m.description.includes('+1 bonus to AC'))
})
