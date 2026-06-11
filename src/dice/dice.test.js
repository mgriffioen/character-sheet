import { test } from 'node:test'
import assert from 'node:assert/strict'

import { parseExpression, rollExpression, rollD20, rollDice } from './dice.js'

test('parseExpression handles simple dice', () => {
  const p = parseExpression('2d6+3')
  assert.equal(p.valid, true)
  assert.equal(p.terms.length, 2)
  assert.deepEqual(p.terms[0], { kind: 'dice', sign: 1, count: 2, sides: 6 })
  assert.deepEqual(p.terms[1], { kind: 'flat', sign: 1, value: 3 })
})

test('parseExpression handles implicit count and multiple terms', () => {
  const p = parseExpression('d20 + 1d4 - 2')
  assert.equal(p.valid, true)
  assert.equal(p.terms[0].count, 1) // "d20" => 1d20
  assert.equal(p.terms[0].sides, 20)
  assert.equal(p.terms[1].sides, 4)
  assert.equal(p.terms[2].sign, -1)
  assert.equal(p.terms[2].value, 2)
})

test('parseExpression rejects garbage', () => {
  assert.equal(parseExpression('hello').valid, false)
  assert.equal(parseExpression('2d').valid, false)
  assert.equal(parseExpression('').valid, false)
})

test('rollDice stays within bounds', () => {
  for (let i = 0; i < 200; i++) {
    const { rolls, total } = rollDice(3, 6)
    assert.equal(rolls.length, 3)
    rolls.forEach((r) => assert.ok(r >= 1 && r <= 6))
    assert.equal(total, rolls.reduce((a, b) => a + b, 0))
  }
})

test('rollExpression totals match breakdown', () => {
  for (let i = 0; i < 200; i++) {
    const r = rollExpression('2d6+3')
    assert.ok(r.total >= 5 && r.total <= 15)
  }
})

test('rollD20 advantage keeps the higher die', () => {
  for (let i = 0; i < 500; i++) {
    const r = rollD20({ modifier: 2, mode: 'advantage' })
    assert.equal(r.dice.length, 2)
    assert.equal(r.kept, Math.max(...r.dice))
    assert.equal(r.total, r.kept + 2)
  }
})

test('rollD20 disadvantage keeps the lower die', () => {
  for (let i = 0; i < 500; i++) {
    const r = rollD20({ modifier: 0, mode: 'disadvantage' })
    assert.equal(r.kept, Math.min(...r.dice))
  }
})

test('rollD20 flags nat 20 and nat 1', () => {
  let saw20 = false
  let saw1 = false
  for (let i = 0; i < 2000 && !(saw20 && saw1); i++) {
    const r = rollD20({})
    if (r.isNat20) {
      saw20 = true
      assert.equal(r.kept, 20)
    }
    if (r.isNat1) {
      saw1 = true
      assert.equal(r.kept, 1)
    }
  }
  assert.ok(saw20 && saw1)
})
