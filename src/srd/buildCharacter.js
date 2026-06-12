// Assemble a complete level-1 character model from guided-builder choices made
// against SRD data. Pure and defensive: unknown/missing fields degrade rather
// than throw, and anything imperfect can be corrected in the manual editors.

import { createBlankCharacter, cryptoId } from '../model/character.js'
import { ABILITIES, abilityModifier, fullCasterSlots, DDB_SKILL_SUBTYPE_TO_KEY } from '../rules/dnd.js'

const FULL_CASTERS = ['bard', 'cleric', 'druid', 'sorcerer', 'wizard']

// SRD skill proficiency index ("skill-animal-handling") -> our key.
export function skillKeyFromSrd(index) {
  if (!index) return null
  const hyphen = String(index).replace(/^skill-/, '')
  return DDB_SKILL_SUBTYPE_TO_KEY[hyphen] || null
}

// Pull the skill-selection choice out of a class's proficiency_choices.
// Returns { choose, options: [{ key, name }] } or null.
export function classSkillChoice(klass) {
  for (const ch of klass?.proficiency_choices || []) {
    const opts = ch.from?.options || ch.from || []
    const options = []
    for (const o of opts) {
      const idx = o.item?.index || o.index
      const key = skillKeyFromSrd(idx)
      if (key) options.push({ key, name: (o.item?.name || o.name || key).replace(/^Skill:\s*/i, '') })
    }
    if (options.length) return { choose: ch.choose || 1, options }
  }
  return null
}

function categorize(name, into) {
  const n = (name || '').toLowerCase()
  if (!n || n.startsWith('saving throw') || n.startsWith('skill')) return
  if (n.includes('armor') || n.includes('shield')) into.armor.push(name)
  else if (n.includes('weapon')) into.weapons.push(name)
  else into.tools.push(name)
}

const uniq = (arr) => [...new Set(arr.filter(Boolean))]

export function buildCharacter({ name, baseAbilities, race, klass, chosenSkillKeys = [], background } = {}) {
  const c = createBlankCharacter()
  c.source = 'builder'
  c.name = (name || '').trim() || 'New Hero'

  // Abilities: chosen base + racial bonuses.
  const abilities = {}
  for (const a of ABILITIES) abilities[a] = Number(baseAbilities?.[a]) || 10
  for (const ab of race?.ability_bonuses || []) {
    const key = ab.ability_score?.index
    if (key && abilities[key] != null) abilities[key] += Number(ab.bonus) || 0
  }
  c.abilities = abilities

  const profs = { languages: [], armor: [], weapons: [], tools: [] }

  // Race.
  c.race = race?.name || ''
  c.speed = Number(race?.speed) || 30
  for (const l of race?.languages || []) profs.languages.push(l.name)
  for (const p of race?.starting_proficiencies || []) categorize(p.name, profs)

  // Class (level 1).
  if (klass) {
    const hitDie = Number(klass.hit_die) || 8
    const spellAbility = klass.spellcasting?.spellcasting_ability?.index || null
    c.classes = [
      { name: klass.name, level: 1, subclass: '', hitDie: `d${hitDie}`, spellcastingAbility: spellAbility },
    ]
    for (const s of klass.saving_throws || []) {
      if (c.saveProficiencies[s.index] != null) c.saveProficiencies[s.index] = true
    }
    for (const p of klass.proficiencies || []) categorize(p.name, profs)

    const max = hitDie + abilityModifier(abilities.con)
    c.hp = { max, current: max, temp: 0 }
    c.hitDice = [{ die: `d${hitDie}`, total: 1, used: 0 }]

    const slots = {}
    if (FULL_CASTERS.includes(klass.index)) {
      fullCasterSlots(1).forEach((n, i) => {
        if (n > 0) slots[String(i + 1)] = { max: n, used: 0 }
      })
    }
    c.spellcasting = { ...c.spellcasting, ability: spellAbility, slots }
  }

  // Skills: chosen class skills + background skills.
  for (const key of chosenSkillKeys) {
    if (c.skillProficiencies[key] != null) c.skillProficiencies[key] = 1
  }
  for (const p of background?.starting_proficiencies || []) {
    const key = skillKeyFromSrd(p.index)
    if (key) c.skillProficiencies[key] = 1
  }
  c.background = background?.name || ''

  // Features: race traits (names) + background feature (with text).
  const features = []
  for (const t of race?.traits || []) {
    if (t.name) features.push({ id: cryptoId(), name: t.name, source: race.name || 'Race', level: 1, description: '' })
  }
  if (background?.feature?.name) {
    features.push({
      id: cryptoId(),
      name: background.feature.name,
      source: background.name || 'Background',
      level: null,
      description: Array.isArray(background.feature.desc) ? background.feature.desc.join('\n\n') : '',
    })
  }
  c.features = features

  c.proficiencies = {
    languages: uniq(profs.languages),
    armor: uniq(profs.armor),
    weapons: uniq(profs.weapons),
    tools: uniq(profs.tools),
  }

  return c
}
