// Core D&D 5e rules: constants and pure math helpers.
// Everything here is framework-agnostic and unit-testable.

// Canonical ability order used throughout the app.
export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export const ABILITY_NAMES = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
}

// D&D Beyond encodes ability scores by numeric id (1..6).
export const DDB_STAT_ID_TO_ABILITY = {
  1: 'str',
  2: 'dex',
  3: 'con',
  4: 'int',
  5: 'wis',
  6: 'cha',
}

// The 18 standard skills, each tied to a governing ability.
export const SKILLS = [
  { key: 'acrobatics', name: 'Acrobatics', ability: 'dex' },
  { key: 'animalHandling', name: 'Animal Handling', ability: 'wis' },
  { key: 'arcana', name: 'Arcana', ability: 'int' },
  { key: 'athletics', name: 'Athletics', ability: 'str' },
  { key: 'deception', name: 'Deception', ability: 'cha' },
  { key: 'history', name: 'History', ability: 'int' },
  { key: 'insight', name: 'Insight', ability: 'wis' },
  { key: 'intimidation', name: 'Intimidation', ability: 'cha' },
  { key: 'investigation', name: 'Investigation', ability: 'int' },
  { key: 'medicine', name: 'Medicine', ability: 'wis' },
  { key: 'nature', name: 'Nature', ability: 'int' },
  { key: 'perception', name: 'Perception', ability: 'wis' },
  { key: 'performance', name: 'Performance', ability: 'cha' },
  { key: 'persuasion', name: 'Persuasion', ability: 'cha' },
  { key: 'religion', name: 'Religion', ability: 'int' },
  { key: 'sleightOfHand', name: 'Sleight of Hand', ability: 'dex' },
  { key: 'stealth', name: 'Stealth', ability: 'dex' },
  { key: 'survival', name: 'Survival', ability: 'wis' },
]

// Map a D&D Beyond skill subType (hyphenated, lowercase) to our camelCase key.
export const DDB_SKILL_SUBTYPE_TO_KEY = {
  acrobatics: 'acrobatics',
  'animal-handling': 'animalHandling',
  arcana: 'arcana',
  athletics: 'athletics',
  deception: 'deception',
  history: 'history',
  insight: 'insight',
  intimidation: 'intimidation',
  investigation: 'investigation',
  medicine: 'medicine',
  nature: 'nature',
  perception: 'perception',
  performance: 'performance',
  persuasion: 'persuasion',
  religion: 'religion',
  'sleight-of-hand': 'sleightOfHand',
  stealth: 'stealth',
  survival: 'survival',
}

// DDB ability-score / saving-throw subType prefixes -> our ability key.
export const DDB_ABILITY_SUBTYPE = {
  strength: 'str',
  dexterity: 'dex',
  constitution: 'con',
  intelligence: 'int',
  wisdom: 'wis',
  charisma: 'cha',
}

export const SKILL_BY_KEY = Object.fromEntries(SKILLS.map((s) => [s.key, s]))

// Standard 5e ability modifier.
export function abilityModifier(score) {
  return Math.floor((Number(score || 10) - 10) / 2)
}

// Proficiency bonus from total character level (1..20+).
export function proficiencyBonus(level) {
  const lvl = Math.max(1, Number(level || 1))
  return Math.ceil(lvl / 4) + 1
}

// Format a signed number, e.g. 3 -> "+3", -1 -> "-1", 0 -> "+0".
export function signed(n) {
  const v = Number(n || 0)
  return v >= 0 ? `+${v}` : `${v}`
}

// Proficiency level -> multiplier applied to the proficiency bonus.
//   0 = not proficient, 1 = proficient, 2 = expertise, 0.5 = half (Jack of all trades / bard)
export function proficiencyMultiplier(profLevel) {
  return profLevel || 0
}
