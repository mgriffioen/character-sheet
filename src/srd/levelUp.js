// Core logic for the guided level-up. Pure and defensive so it works even when
// the SRD class data can't be fetched (sensible fallbacks).

import { cryptoId } from '../model/character.js'
import { fullCasterSlots } from '../rules/dnd.js'

const FULL_CASTERS = ['bard', 'cleric', 'druid', 'sorcerer', 'wizard']
const STANDARD_ASI_LEVELS = [4, 8, 12, 16, 19]

export function dieSides(hitDie) {
  return Number(String(hitDie || 'd8').replace(/^d/, '')) || 8
}

// Fixed "average" HP for a hit die (e.g. d8 -> 5, d10 -> 6).
export function hitDieAverage(hitDie) {
  return Math.floor(dieSides(hitDie) / 2) + 1
}

// Find the SRD level record (the /classes/{index}/levels array is per level).
export function levelRecord(levelsData, level) {
  if (!Array.isArray(levelsData)) return null
  return levelsData.find((l) => l.level === level) || null
}

// Is the *new* class level an ability-score-improvement level? Prefer the SRD
// data (its ability_score_bonuses count increments on ASI levels); fall back to
// the standard 4/8/12/16/19 progression.
export function isAsiLevel(newLevel, levelsData) {
  const cur = levelRecord(levelsData, newLevel)
  const prev = levelRecord(levelsData, newLevel - 1)
  if (cur && prev && cur.ability_score_bonuses != null && prev.ability_score_bonuses != null) {
    return cur.ability_score_bonuses > prev.ability_score_bonuses
  }
  return STANDARD_ASI_LEVELS.includes(newLevel)
}

// Build the spell-slot map for a class level: from SRD level data if present,
// otherwise the full-caster table for known full casters. Returns null if the
// class isn't a caster (so existing slots are left untouched).
export function slotsForLevel({ classIndex, newLevel, levelsData, prevSlots = {} }) {
  const rec = levelRecord(levelsData, newLevel)
  const sc = rec?.spellcasting
  const keepUsed = (lvl, max) => Math.min(prevSlots[String(lvl)]?.used || 0, max)

  if (sc) {
    const slots = {}
    let any = false
    for (let i = 1; i <= 9; i++) {
      const max = sc[`spell_slots_level_${i}`] || 0
      if (max > 0) {
        any = true
        slots[String(i)] = { max, used: keepUsed(i, max) }
      }
    }
    return any ? slots : null
  }

  if (FULL_CASTERS.includes(classIndex)) {
    const slots = {}
    fullCasterSlots(newLevel).forEach((max, idx) => {
      if (max > 0) slots[String(idx + 1)] = { max, used: keepUsed(idx + 1, max) }
    })
    return slots
  }
  return null
}

// New class features gained at a level, as our feature objects.
export function featuresForLevel({ levelsData, newLevel, className }) {
  const rec = levelRecord(levelsData, newLevel)
  return (rec?.features || [])
    .filter((f) => f?.name)
    .map((f) => ({ id: cryptoId(), name: f.name, source: className || 'Class', level: newLevel, description: '' }))
}

// Apply a chosen level-up to a character, returning the next character.
export function levelUpCharacter(
  character,
  { classArrayIndex = 0, hpGain = 0, abilityIncreases = {}, subclass, features = [], slots } = {}
) {
  const classes = (character.classes || []).map((cl, i) =>
    i === classArrayIndex
      ? { ...cl, level: (cl.level || 1) + 1, subclass: subclass || cl.subclass || '' }
      : cl
  )

  const hp = {
    ...character.hp,
    max: (character.hp?.max || 0) + hpGain,
    current: (character.hp?.current || 0) + hpGain,
  }

  const abilities = { ...character.abilities }
  for (const [k, v] of Object.entries(abilityIncreases || {})) {
    if (abilities[k] != null) abilities[k] = Math.min(20, abilities[k] + (Number(v) || 0))
  }

  const hitDice =
    character.hitDice && character.hitDice[classArrayIndex]
      ? character.hitDice.map((hd, i) =>
          i === classArrayIndex ? { ...hd, total: (hd.total || 0) + 1 } : hd
        )
      : character.hitDice

  const spellcasting = slots
    ? { ...character.spellcasting, slots }
    : character.spellcasting

  return {
    ...character,
    classes,
    hp,
    abilities,
    hitDice,
    features: [...(character.features || []), ...features],
    spellcasting,
  }
}
