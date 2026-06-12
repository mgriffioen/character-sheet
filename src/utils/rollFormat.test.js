import { test } from 'node:test'
import assert from 'node:assert/strict'

import { rollVisual } from './rollFormat.js'

test('rollVisual: d20 shows kept face on a d20, total beside', () => {
  const v = rollVisual({ kind: 'd20', kept: 14, total: 18, modifier: 4 })
  assert.equal(v.sides, 20)
  assert.equal(v.dieValue, 14)
  assert.equal(v.total, 18)
})

test('rollVisual: formula uses largest die and the dice subtotal', () => {
  const v = rollVisual({
    kind: 'formula',
    total: 11,
    breakdown: [
      { kind: 'dice', sign: 1, count: 2, sides: 6, rolls: [3, 5] },
      { kind: 'flat', sign: 1, value: 3 },
    ],
  })
  assert.equal(v.sides, 6)
  assert.equal(v.dieValue, 8)
  assert.equal(v.total, 11)
})

test('rollVisual: damage uses the largest die part', () => {
  const v = rollVisual({ kind: 'damage', total: 9, modifier: 2, parts: [{ count: 1, sides: 8, rolls: [7] }] })
  assert.equal(v.sides, 8)
  assert.equal(v.dieValue, 7)
  assert.equal(v.total, 9)
})

test('rollVisual: flat hit (no dice) has no die shape', () => {
  const v = rollVisual({ kind: 'damage', total: 2, modifier: 2, parts: [{ count: 0, sides: 0, rolls: [] }] })
  assert.equal(v.sides, null)
  assert.equal(v.total, 2)
})

test('rollVisual: advantage exposes both faces and keeps the higher', () => {
  const v = rollVisual({ kind: 'd20', dice: [7, 18], kept: 18, total: 21, mode: 'advantage' })
  assert.deepEqual(v.faces, [7, 18])
  assert.equal(v.kept, 18)
  assert.equal(v.dropped, 7)
  assert.equal(v.diceCount, 2)
})

test('rollVisual: disadvantage drops the higher face', () => {
  const v = rollVisual({ kind: 'd20', dice: [7, 18], kept: 7, total: 9, mode: 'disadvantage' })
  assert.equal(v.dropped, 18)
  assert.equal(v.diceCount, 2)
})

test('rollVisual: diceCount counts dice across a formula', () => {
  const v = rollVisual({
    kind: 'formula',
    total: 24,
    breakdown: [{ kind: 'dice', sign: 1, count: 8, sides: 6, rolls: [1, 2, 3, 4, 5, 6, 1, 2] }],
  })
  assert.equal(v.diceCount, 8)
  assert.equal(v.sides, 6)
})
