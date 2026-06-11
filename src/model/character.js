// The canonical, app-internal character model.
//
// This is intentionally decoupled from D&D Beyond's raw format: importers
// (DDB today, others later) translate into THIS shape, and the whole UI reads
// only from here. Derived values (modifiers, save totals, etc.) are computed
// on the fly from `rules/derive.js`, except where the user has set an override.

import { ABILITIES, SKILLS } from '../rules/dnd.js'

export const MODEL_VERSION = 1

export function emptyAbilities() {
  return ABILITIES.reduce((acc, a) => ({ ...acc, [a]: 10 }), {})
}

// Per-skill proficiency level: 0 none, 1 proficient, 2 expertise, 0.5 half.
export function emptySkillProficiencies() {
  return SKILLS.reduce((acc, s) => ({ ...acc, [s.key]: 0 }), {})
}

export function emptySaveProficiencies() {
  return ABILITIES.reduce((acc, a) => ({ ...acc, [a]: false }), {})
}

// A blank character with sensible defaults. `overrides` holds any value the
// user has manually pinned (e.g. a hand-tweaked AC) so it survives re-derive.
export function createBlankCharacter() {
  return {
    modelVersion: MODEL_VERSION,
    id: cryptoId(),
    name: 'New Character',
    avatarUrl: null,
    source: 'manual', // 'manual' | 'ddb'

    race: '',
    background: '',
    alignment: '',
    classes: [], // [{ name, level, subclass, hitDie, spellcastingAbility }]

    abilities: emptyAbilities(),
    saveProficiencies: emptySaveProficiencies(),
    skillProficiencies: emptySkillProficiencies(),

    proficiencyBonusOverride: null, // null = derive from level

    hp: { max: 0, current: 0, temp: 0 },
    ac: 10,
    initiativeBonus: 0, // extra beyond DEX mod
    speed: 30,
    hitDice: [], // [{ die: 'd10', total, used }]
    deathSaves: { successes: 0, failures: 0 },

    senses: { passivePerception: null }, // null = derive
    proficiencies: { languages: [], armor: [], weapons: [], tools: [] },

    currencies: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },

    // Combat actions / attacks the user can roll directly.
    // { id, name, source, actionType, range, toHitBonus, damage:[{count,sides,type,bonus}], save, notes }
    actions: [],

    inventory: [], // { id, name, type, quantity, weight, equipped, attuned, rarity, description }

    spellcasting: {
      // by source/class; spells carry their own level
      slots: {}, // { '1': {max, used}, '2': {...}, ... }
      spells: [], // { id, name, level, school, castingTime, range, duration, components, concentration, ritual, prepared, description, source, ability }
    },

    features: [], // { id, name, source, level, description }

    notes: '',

    // User-pinned overrides for derived values. Keys we honor:
    //   ac, hpMax, initiative, passivePerception, proficiencyBonus, speed
    overrides: {},
  }
}

export function cryptoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Total character level across all classes.
export function totalLevel(character) {
  if (!character?.classes?.length) return 1
  return character.classes.reduce((sum, c) => sum + (Number(c.level) || 0), 0) || 1
}

// Human-readable class line, e.g. "Fighter 3 / Rogue 2".
export function classLine(character) {
  if (!character?.classes?.length) return '—'
  return character.classes
    .map((c) => `${c.name}${c.subclass ? ` (${c.subclass})` : ''} ${c.level}`)
    .join(' / ')
}
