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
