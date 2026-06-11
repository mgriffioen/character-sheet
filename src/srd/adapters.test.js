import { test } from 'node:test'
import assert from 'node:assert/strict'

import { srdSpellToModel, srdItemToModel } from './adapters.js'

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
