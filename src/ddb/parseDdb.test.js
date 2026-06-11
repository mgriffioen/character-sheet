import { test } from 'node:test'
import assert from 'node:assert/strict'

import { parseDdbCharacter } from './parseDdb.js'
import { sampleDdbCharacter } from './sampleDdbCharacter.js'
import {
  getSaves,
  getSkills,
  getProficiencyBonus,
  getPassivePerception,
  getSpellSaveDC,
  getSpellAttackBonus,
} from '../rules/derive.js'

const c = parseDdbCharacter(sampleDdbCharacter)

test('basic identity', () => {
  assert.equal(c.name, 'Lyra Quickwit')
  assert.equal(c.race, 'Half-Elf')
  assert.equal(c.classes[0].name, 'Bard')
  assert.equal(c.classes[0].level, 5)
  assert.equal(c.classes[0].subclass, 'College of Lore')
  assert.equal(c.alignment, 'True Neutral')
})

test('ability scores combine base + racial + ASI', () => {
  assert.equal(c.abilities.str, 8)
  assert.equal(c.abilities.dex, 15) // 14 + 1 racial
  assert.equal(c.abilities.con, 14) // 13 + 1 racial
  assert.equal(c.abilities.int, 10)
  assert.equal(c.abilities.wis, 12)
  assert.equal(c.abilities.cha, 19) // 15 + 2 racial + 2 ASI
})

test('proficiency bonus from level', () => {
  assert.equal(getProficiencyBonus(c), 3)
})

test('saving throw proficiencies and totals', () => {
  const saves = getSaves(c)
  assert.equal(saves.dex.proficient, true)
  assert.equal(saves.cha.proficient, true)
  assert.equal(saves.str.proficient, false)
  assert.equal(saves.dex.total, 5) // +2 dex + 3 pb
  assert.equal(saves.cha.total, 7) // +4 cha + 3 pb
  assert.equal(saves.str.total, -1) // just the mod
})

test('skill proficiency and expertise', () => {
  const skills = getSkills(c)
  assert.equal(skills.persuasion.total, 10) // +4 cha + 6 (expertise)
  assert.equal(skills.perception.total, 7) // +1 wis + 6 (expertise)
  assert.equal(skills.performance.total, 7) // +4 cha + 3 (prof)
  assert.equal(skills.deception.total, 7) // +4 cha + 3 (prof)
  assert.equal(skills.athletics.total, -1) // -1 str, not proficient
})

test('passive perception', () => {
  assert.equal(getPassivePerception(c), 17) // 10 + 7
})

test('hit points include CON per level', () => {
  assert.equal(c.hp.max, 38) // 28 base + 2 con x 5
  assert.equal(c.hp.current, 38)
})

test('armor class from light armor + dex', () => {
  assert.equal(c.ac, 14) // studded leather 12 + dex 2
})

test('speed', () => {
  assert.equal(c.speed, 30)
})

test('spell save DC and attack', () => {
  assert.equal(getSpellSaveDC(c, 'cha'), 15) // 8 + 3 + 4
  assert.equal(getSpellAttackBonus(c, 'cha'), 7) // 3 + 4
})

test('spells imported with levels and components', () => {
  const names = c.spellcasting.spells.map((s) => s.name)
  assert.ok(names.includes('Vicious Mockery'))
  assert.ok(names.includes('Shatter'))
  const vm = c.spellcasting.spells.find((s) => s.name === 'Vicious Mockery')
  assert.equal(vm.level, 0)
  const shatter = c.spellcasting.spells.find((s) => s.name === 'Shatter')
  assert.equal(shatter.level, 2)
  assert.equal(shatter.components, 'V, S, M')
})

test('spell slots for level 5 bard', () => {
  assert.deepEqual(c.spellcasting.slots['1'], { max: 4, used: 0 })
  assert.deepEqual(c.spellcasting.slots['2'], { max: 3, used: 0 })
  assert.deepEqual(c.spellcasting.slots['3'], { max: 2, used: 0 })
})

test('inventory parsed with equipped flags', () => {
  const armor = c.inventory.find((i) => i.name === 'Studded Leather Armor')
  assert.ok(armor)
  assert.equal(armor.equipped, true)
})

test('weapon attack: finesse rapier uses DEX', () => {
  const rapier = c.actions.find((a) => a.name === 'Rapier')
  assert.ok(rapier)
  assert.equal(rapier.ability, 'dex')
  assert.equal(rapier.toHitBonus, 5) // dex 2 + pb 3
  assert.equal(rapier.damage[0].count, 1)
  assert.equal(rapier.damage[0].sides, 8)
  assert.equal(rapier.damage[0].bonus, 2) // dex mod
})

test('class features filtered to level (no level-10 feature)', () => {
  const names = c.features.map((f) => f.name)
  assert.ok(names.includes('Bardic Inspiration'))
  assert.ok(names.includes('Font of Inspiration'))
  assert.ok(!names.includes('Magical Secrets')) // requiredLevel 10 > 5
})

test('currencies', () => {
  assert.equal(c.currencies.gp, 75)
  assert.equal(c.currencies.pp, 1)
})
