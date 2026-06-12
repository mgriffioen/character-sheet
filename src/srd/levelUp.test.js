import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  hitDieAverage,
  isAsiLevel,
  slotsForLevel,
  featuresForLevel,
  levelUpCharacter,
} from './levelUp.js'

const wizardLevels = [
  { level: 4, ability_score_bonuses: 1, features: [{ name: 'ASI' }], spellcasting: { spell_slots_level_1: 4, spell_slots_level_2: 3 } },
  {
    level: 5,
    ability_score_bonuses: 1,
    features: [{ name: 'Wizardly Thing' }],
    spellcasting: { spell_slots_level_1: 4, spell_slots_level_2: 3, spell_slots_level_3: 2 },
  },
]

test('hitDieAverage', () => {
  assert.equal(hitDieAverage('d6'), 4)
  assert.equal(hitDieAverage('d8'), 5)
  assert.equal(hitDieAverage('d10'), 6)
  assert.equal(hitDieAverage('d12'), 7)
})

test('isAsiLevel via SRD data and fallback', () => {
  // 4 has 1 bonus, 3 would have 0 -> ASI at 4 (but our data lacks lvl 3; fallback)
  assert.equal(isAsiLevel(5, wizardLevels), false) // 5 same bonus count as 4
  assert.equal(isAsiLevel(8, null), true) // fallback standard ASI level
  assert.equal(isAsiLevel(7, null), false)
})

test('slotsForLevel from SRD data preserves used (capped)', () => {
  const slots = slotsForLevel({
    classIndex: 'wizard',
    newLevel: 5,
    levelsData: wizardLevels,
    prevSlots: { 1: { max: 4, used: 2 }, 2: { max: 3, used: 5 } },
  })
  assert.deepEqual(slots['1'], { max: 4, used: 2 })
  assert.deepEqual(slots['2'], { max: 3, used: 3 }) // used capped to max
  assert.deepEqual(slots['3'], { max: 2, used: 0 })
})

test('slotsForLevel falls back to full-caster table without SRD data', () => {
  const slots = slotsForLevel({ classIndex: 'bard', newLevel: 5, levelsData: null })
  assert.deepEqual(slots['1'], { max: 4, used: 0 })
  assert.deepEqual(slots['3'], { max: 2, used: 0 })
})

test('slotsForLevel returns null for non-casters', () => {
  assert.equal(slotsForLevel({ classIndex: 'fighter', newLevel: 5, levelsData: null }), null)
})

test('featuresForLevel maps SRD features', () => {
  const f = featuresForLevel({ levelsData: wizardLevels, newLevel: 5, className: 'Wizard' })
  assert.equal(f.length, 1)
  assert.equal(f[0].name, 'Wizardly Thing')
  assert.equal(f[0].source, 'Wizard')
})

test('levelUpCharacter applies level, HP, ASI, features, slots', () => {
  const character = {
    classes: [{ name: 'Wizard', level: 4, subclass: '', hitDie: 'd6' }],
    hp: { max: 22, current: 14, temp: 0 },
    abilities: { str: 8, dex: 14, con: 13, int: 19, wis: 12, cha: 10 },
    features: [],
    spellcasting: { ability: 'int', slots: { 1: { max: 4, used: 1 } } },
    hitDice: [{ die: 'd6', total: 4, used: 0 }],
  }
  const next = levelUpCharacter(character, {
    classArrayIndex: 0,
    hpGain: 5,
    abilityIncreases: { int: 2 },
    features: [{ id: 'x', name: 'Wizardly Thing', source: 'Wizard', level: 5, description: '' }],
    slots: { 1: { max: 4, used: 1 }, 2: { max: 3, used: 0 } },
  })

  assert.equal(next.classes[0].level, 5)
  assert.equal(next.hp.max, 27)
  assert.equal(next.hp.current, 19)
  assert.equal(next.abilities.int, 20) // 19 + 2 capped at 20
  assert.equal(next.features.length, 1)
  assert.deepEqual(next.spellcasting.slots['2'], { max: 3, used: 0 })
  assert.equal(next.hitDice[0].total, 5)
})
