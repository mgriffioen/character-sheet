// Derived character values, computed from the internal model.
// Anything the user has pinned in `character.overrides` wins over the formula.

import {
  ABILITIES,
  SKILLS,
  abilityModifier,
  proficiencyBonus as profBonusForLevel,
} from './dnd.js'
import { totalLevel } from '../model/character.js'

function override(character, key) {
  const v = character?.overrides?.[key]
  return v === undefined || v === null || v === '' ? null : v
}

export function getProficiencyBonus(character) {
  const o = override(character, 'proficiencyBonus')
  if (o !== null) return Number(o)
  if (character.proficiencyBonusOverride != null) return Number(character.proficiencyBonusOverride)
  return profBonusForLevel(totalLevel(character))
}

export function getAbilityModifiers(character) {
  return ABILITIES.reduce(
    (acc, a) => ({ ...acc, [a]: abilityModifier(character.abilities?.[a]) }),
    {}
  )
}

// Saving throw totals: ability mod + (proficient ? proficiency bonus : 0).
export function getSaves(character) {
  const mods = getAbilityModifiers(character)
  const pb = getProficiencyBonus(character)
  return ABILITIES.reduce((acc, a) => {
    const proficient = !!character.saveProficiencies?.[a]
    return {
      ...acc,
      [a]: { total: mods[a] + (proficient ? pb : 0), proficient },
    }
  }, {})
}

// Skill totals: ability mod + proficiency*pb (0/0.5/1/2).
export function getSkills(character) {
  const mods = getAbilityModifiers(character)
  const pb = getProficiencyBonus(character)
  return SKILLS.reduce((acc, s) => {
    const profLevel = character.skillProficiencies?.[s.key] || 0
    const bonus = Math.floor(profLevel * pb)
    return {
      ...acc,
      [s.key]: {
        name: s.name,
        ability: s.ability,
        profLevel,
        total: mods[s.ability] + bonus,
      },
    }
  }, {})
}

export function getInitiative(character) {
  const o = override(character, 'initiative')
  if (o !== null) return Number(o)
  const dex = abilityModifier(character.abilities?.dex)
  return dex + (Number(character.initiativeBonus) || 0)
}

export function getPassivePerception(character) {
  const o = override(character, 'passivePerception')
  if (o !== null) return Number(o)
  if (character.senses?.passivePerception != null) return Number(character.senses.passivePerception)
  const skills = getSkills(character)
  return 10 + (skills.perception?.total || 0)
}

export function getAC(character) {
  const o = override(character, 'ac')
  if (o !== null) return Number(o)
  return Number(character.ac) || 10
}

export function getMaxHp(character) {
  const o = override(character, 'hpMax')
  if (o !== null) return Number(o)
  return Number(character.hp?.max) || 0
}

export function getSpeed(character) {
  const o = override(character, 'speed')
  if (o !== null) return Number(o)
  return Number(character.speed) || 30
}

export function getSpellSaveDC(character, ability) {
  const mods = getAbilityModifiers(character)
  return 8 + getProficiencyBonus(character) + (mods[ability] || 0)
}

export function getSpellAttackBonus(character, ability) {
  const mods = getAbilityModifiers(character)
  return getProficiencyBonus(character) + (mods[ability] || 0)
}
