import { test } from 'node:test'
import assert from 'node:assert/strict'

import { abilityModifier, proficiencyBonus, fullCasterSlots, signed } from './dnd.js'

test('abilityModifier', () => {
  assert.equal(abilityModifier(10), 0)
  assert.equal(abilityModifier(15), 2)
  assert.equal(abilityModifier(8), -1)
  assert.equal(abilityModifier(20), 5)
  assert.equal(abilityModifier(1), -5)
})

test('proficiencyBonus scales with level', () => {
  assert.equal(proficiencyBonus(1), 2)
  assert.equal(proficiencyBonus(4), 2)
  assert.equal(proficiencyBonus(5), 3)
  assert.equal(proficiencyBonus(12), 4)
  assert.equal(proficiencyBonus(17), 6)
})

test('fullCasterSlots matches the standard table', () => {
  assert.deepEqual(fullCasterSlots(1), [2])
  assert.deepEqual(fullCasterSlots(5), [4, 3, 2])
  assert.deepEqual(fullCasterSlots(20), [4, 3, 3, 3, 3, 2, 2, 1, 1])
})

test('signed formats with explicit sign', () => {
  assert.equal(signed(3), '+3')
  assert.equal(signed(-1), '-1')
  assert.equal(signed(0), '+0')
})
