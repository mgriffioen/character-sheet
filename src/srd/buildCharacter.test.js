import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildCharacter, skillKeyFromSrd, classSkillChoice } from './buildCharacter.js'
import { getSaves, getSkills, getMaxHp } from '../rules/derive.js'

const hillDwarf = {
  index: 'hill-dwarf',
  name: 'Hill Dwarf',
  speed: 25,
  ability_bonuses: [
    { ability_score: { index: 'con' }, bonus: 2 },
    { ability_score: { index: 'wis' }, bonus: 1 },
  ],
  languages: [{ name: 'Common' }, { name: 'Dwarvish' }],
  starting_proficiencies: [{ index: 'battleaxes', name: 'Battleaxes' }],
  traits: [{ index: 'darkvision', name: 'Darkvision' }, { index: 'dwarven-resilience', name: 'Dwarven Resilience' }],
}

const fighter = {
  index: 'fighter',
  name: 'Fighter',
  hit_die: 10,
  saving_throws: [{ index: 'str' }, { index: 'con' }],
  proficiencies: [{ name: 'All armor' }, { name: 'Shields' }, { name: 'Simple Weapons' }, { name: 'Martial Weapons' }],
  proficiency_choices: [
    {
      choose: 2,
      from: {
        options: [
          { item: { index: 'skill-athletics', name: 'Skill: Athletics' } },
          { item: { index: 'skill-perception', name: 'Skill: Perception' } },
          { item: { index: 'skill-intimidation', name: 'Skill: Intimidation' } },
        ],
      },
    },
  ],
}

const wizard = {
  index: 'wizard',
  name: 'Wizard',
  hit_die: 6,
  saving_throws: [{ index: 'int' }, { index: 'wis' }],
  proficiencies: [{ name: 'Daggers' }],
  spellcasting: { spellcasting_ability: { index: 'int' } },
}

const soldier = {
  index: 'soldier',
  name: 'Soldier',
  starting_proficiencies: [
    { index: 'skill-athletics', name: 'Skill: Athletics' },
    { index: 'skill-intimidation', name: 'Skill: Intimidation' },
  ],
  feature: { name: 'Military Rank', desc: ['You have a military rank from your career as a soldier.'] },
}

test('skillKeyFromSrd maps SRD skill indexes', () => {
  assert.equal(skillKeyFromSrd('skill-stealth'), 'stealth')
  assert.equal(skillKeyFromSrd('skill-animal-handling'), 'animalHandling')
  assert.equal(skillKeyFromSrd('battleaxes'), null)
})

test('classSkillChoice extracts the skill options', () => {
  const choice = classSkillChoice(fighter)
  assert.equal(choice.choose, 2)
  assert.deepEqual(
    choice.options.map((o) => o.key).sort(),
    ['athletics', 'intimidation', 'perception']
  )
})

test('buildCharacter assembles a level-1 fighter', () => {
  const c = buildCharacter({
    name: 'Durin',
    baseAbilities: { str: 15, dex: 13, con: 14, int: 10, wis: 12, cha: 8 },
    race: hillDwarf,
    klass: fighter,
    chosenSkillKeys: ['perception'],
    background: soldier,
  })

  // Abilities: base + racial (con +2 -> 16, wis +1 -> 13).
  assert.equal(c.abilities.con, 16)
  assert.equal(c.abilities.wis, 13)
  assert.equal(c.abilities.str, 15)

  // HP at level 1 = hit die (10) + CON mod (+3) = 13.
  assert.equal(getMaxHp(c), 13)

  // Saves: STR and CON proficient.
  const saves = getSaves(c)
  assert.equal(saves.str.proficient, true)
  assert.equal(saves.con.proficient, true)
  assert.equal(saves.dex.proficient, false)

  // Skills: chosen (perception) + background (athletics, intimidation).
  const skills = getSkills(c)
  assert.equal(skills.perception.profLevel, 1)
  assert.equal(skills.athletics.profLevel, 1)
  assert.equal(skills.intimidation.profLevel, 1)

  assert.equal(c.speed, 25)
  assert.equal(c.classes[0].name, 'Fighter')
  assert.equal(c.classes[0].level, 1)
  assert.equal(c.background, 'Soldier')
  assert.ok(c.proficiencies.languages.includes('Common'))
  assert.ok(c.proficiencies.armor.includes('All armor'))
  assert.ok(c.features.some((f) => f.name === 'Military Rank'))
  assert.ok(c.features.some((f) => f.name === 'Darkvision'))
})

test('buildCharacter sets spell slots and ability for a full caster', () => {
  const c = buildCharacter({
    name: 'Gandalf',
    baseAbilities: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
    race: hillDwarf,
    klass: wizard,
    chosenSkillKeys: ['arcana'],
    background: soldier,
  })
  assert.equal(c.spellcasting.ability, 'int')
  assert.deepEqual(c.spellcasting.slots['1'], { max: 2, used: 0 })
  assert.equal(c.classes[0].spellcastingAbility, 'int')
})
