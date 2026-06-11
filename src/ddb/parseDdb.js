// Convert a D&D Beyond character export into our internal character model.
//
// DDB JSON is *raw* data — final values (ability totals, AC, HP, save bonuses)
// are not stored and must be computed from base stats plus the `modifiers`
// system. This parser reproduces that math best-effort. Anything it can't
// resolve perfectly (homebrew, unusual items) the user can edit/override in
// the UI, since every value lands in an editable field.

import {
  DDB_STAT_ID_TO_ABILITY,
  DDB_SKILL_SUBTYPE_TO_KEY,
  DDB_ABILITY_SUBTYPE,
  ABILITIES,
  abilityModifier,
} from '../rules/dnd.js'
import { createBlankCharacter, cryptoId } from '../model/character.js'

// ---- helpers --------------------------------------------------------------

// DDB exports come in a few shapes: the raw character object, or wrapped in
// `{ success, data: {...} }` (character-service), or `{ character: {...} }`.
function unwrap(json) {
  if (!json || typeof json !== 'object') return null
  if (json.data && typeof json.data === 'object' && (json.data.stats || json.data.name)) {
    return json.data
  }
  if (json.character && typeof json.character === 'object') return json.character
  return json
}

function num(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

// Inventory items considered "active" for the purposes of granting bonuses:
// equipped, and attuned when the item requires attunement. Returns a Set of
// candidate component ids (both the entry id and the definition id) so we can
// match item-sourced modifiers without phantom bonuses from gear in the bag.
function activeItemIds(ddb) {
  const ids = new Set()
  for (const item of ddb.inventory || []) {
    const def = item.definition || {}
    const requiresAttunement = !!def.canAttune
    const active = item.equipped && (!requiresAttunement || item.isAttuned)
    if (active) {
      if (item.id != null) ids.add(item.id)
      if (def.id != null) ids.add(def.id)
    }
  }
  return ids
}

// Flatten the modifiers object into a single list. Item modifiers are only
// included when their granting item is active (equipped/attuned).
function collectModifiers(ddb) {
  const m = ddb.modifiers || {}
  const active = activeItemIds(ddb)
  const fromItems = (m.item || []).filter(
    (mod) => mod.componentId == null || active.has(mod.componentId)
  )
  return [
    ...(m.race || []),
    ...(m.class || []),
    ...(m.background || []),
    ...(m.feat || []),
    ...(m.condition || []),
    ...fromItems,
  ]
}

function sumModifiers(mods, predicate) {
  return mods.filter(predicate).reduce((sum, mod) => sum + num(mod.value ?? mod.fixedValue), 0)
}

// ---- ability scores -------------------------------------------------------

function parseAbilities(ddb, mods) {
  const stats = ddb.stats || []
  const bonusStats = ddb.bonusStats || []
  const overrideStats = ddb.overrideStats || []

  const byId = (arr, id) => arr.find((s) => s.id === id)
  const abilities = {}

  for (let id = 1; id <= 6; id++) {
    const ability = DDB_STAT_ID_TO_ABILITY[id]
    const abilityName = Object.keys(DDB_ABILITY_SUBTYPE).find(
      (k) => DDB_ABILITY_SUBTYPE[k] === ability
    )
    const base = num(byId(stats, id)?.value, 10)
    const manual = num(byId(bonusStats, id)?.value, 0)

    // Racial bonuses, ASIs, half-feats, etc. surface as `bonus` modifiers.
    const bonus = sumModifiers(
      mods,
      (mod) => mod.type === 'bonus' && mod.subType === `${abilityName}-score`
    )

    let score = base + manual + bonus

    // A user override on DDB sets the final value directly.
    const override = byId(overrideStats, id)?.value
    if (override != null) score = num(override, score)

    // "set" modifiers (e.g. Headband of Intellect) raise — never lower — the score.
    const setMods = mods.filter(
      (mod) => mod.type === 'set' && mod.subType === `${abilityName}-score`
    )
    for (const sm of setMods) score = Math.max(score, num(sm.value))

    abilities[ability] = score
  }
  return abilities
}

// ---- proficiencies (saves & skills) --------------------------------------

function parseSaveProficiencies(mods) {
  const saves = ABILITIES.reduce((acc, a) => ({ ...acc, [a]: false }), {})
  for (const mod of mods) {
    if (mod.type !== 'proficiency') continue
    if (!mod.subType?.endsWith('-saving-throws')) continue
    const prefix = mod.subType.replace('-saving-throws', '')
    const ability = DDB_ABILITY_SUBTYPE[prefix]
    if (ability) saves[ability] = true
  }
  return saves
}

function parseSkillProficiencies(mods) {
  const skills = {}
  // proficiency first, then upgrade to expertise / half where present.
  for (const mod of mods) {
    const key = DDB_SKILL_SUBTYPE_TO_KEY[mod.subType]
    if (!key) continue
    if (mod.type === 'proficiency') skills[key] = Math.max(skills[key] || 0, 1)
    else if (mod.type === 'expertise') skills[key] = 2
    else if (mod.type === 'half-proficiency') skills[key] = Math.max(skills[key] || 0, 0.5)
  }
  return skills
}

// ---- classes --------------------------------------------------------------

function parseClasses(ddb) {
  return (ddb.classes || []).map((c) => {
    const def = c.definition || {}
    return {
      name: def.name || 'Class',
      level: num(c.level, 1),
      subclass: c.subclassDefinition?.name || c.subclassDefinitionName || '',
      hitDie: def.hitDice ? `d${def.hitDice}` : '',
      spellcastingAbility: def.spellCastingAbilityId
        ? DDB_STAT_ID_TO_ABILITY[def.spellCastingAbilityId]
        : null,
    }
  })
}

function totalLevelOf(classes) {
  return classes.reduce((s, c) => s + (c.level || 0), 0) || 1
}

// ---- hit points -----------------------------------------------------------

function parseHp(ddb, abilities, level, mods) {
  const conMod = abilityModifier(abilities.con)
  const base = num(ddb.baseHitPoints)
  const perLevelBonus = sumModifiers(mods, (m) => m.subType === 'hit-points-per-level') * level
  const flatBonus = num(ddb.bonusHitPoints)

  let max = base + conMod * level + perLevelBonus + flatBonus
  if (ddb.overrideHitPoints != null) max = num(ddb.overrideHitPoints, max)

  const removed = num(ddb.removedHitPoints)
  const temp = num(ddb.temporaryHitPoints)
  return { max, current: Math.max(0, max - removed), temp }
}

// ---- armor class ----------------------------------------------------------

const ARMOR_LIGHT = 1
const ARMOR_MEDIUM = 2
const ARMOR_HEAVY = 3
const ARMOR_SHIELD = 4

function parseAC(ddb, abilities, classes, mods) {
  const dexMod = abilityModifier(abilities.dex)
  const inventory = ddb.inventory || []

  const equippedArmor = inventory.find(
    (i) => i.equipped && [ARMOR_LIGHT, ARMOR_MEDIUM, ARMOR_HEAVY].includes(i.definition?.armorTypeId)
  )
  const shield = inventory.find((i) => i.equipped && i.definition?.armorTypeId === ARMOR_SHIELD)

  let ac
  if (equippedArmor) {
    const baseAc = num(equippedArmor.definition.armorClass, 10)
    const t = equippedArmor.definition.armorTypeId
    if (t === ARMOR_LIGHT) ac = baseAc + dexMod
    else if (t === ARMOR_MEDIUM) ac = baseAc + Math.min(dexMod, 2)
    else ac = baseAc // heavy: no dex
  } else {
    // Unarmored: 10 + dex, with class unarmored defense if applicable.
    ac = 10 + dexMod
    const names = classes.map((c) => c.name.toLowerCase())
    if (names.includes('barbarian')) ac = 10 + dexMod + abilityModifier(abilities.con)
    else if (names.includes('monk')) ac = 10 + dexMod + abilityModifier(abilities.wis)
  }

  if (shield) ac += num(shield.definition.armorClass, 2)

  // Flat AC bonuses (Ring/Cloak of Protection, Defense fighting style, etc.).
  ac += sumModifiers(
    mods,
    (m) => m.type === 'bonus' && (m.subType === 'armor-class' || m.subType === 'unarmored-armor-class')
  )

  return ac
}

// ---- speed ----------------------------------------------------------------

function parseSpeed(ddb, mods) {
  const walk = num(ddb.race?.weightSpeeds?.normal?.walk, 30) || 30
  const bonus = sumModifiers(mods, (m) => m.type === 'bonus' && m.subType === 'speed')
  return walk + bonus
}

// ---- currencies -----------------------------------------------------------

function parseCurrencies(ddb) {
  const c = ddb.currencies || {}
  return { cp: num(c.cp), sp: num(c.sp), ep: num(c.ep), gp: num(c.gp), pp: num(c.pp) }
}

// ---- inventory ------------------------------------------------------------

function parseInventory(ddb) {
  return (ddb.inventory || []).map((item) => {
    const def = item.definition || {}
    return {
      id: cryptoId(),
      name: def.name || 'Item',
      type: def.filterType || def.type || 'Gear',
      quantity: num(item.quantity, 1),
      weight: num(def.weight, 0),
      equipped: !!item.equipped,
      attuned: !!item.isAttuned,
      rarity: def.rarity || null,
      magic: !!def.magic,
      description: def.description || '',
    }
  })
}

// ---- spells ---------------------------------------------------------------

const SPELL_COMPONENT_MAP = { 1: 'V', 2: 'S', 3: 'M' }

function formatRange(range) {
  if (!range) return '—'
  if (range.origin === 'Self') return 'Self'
  if (range.origin === 'Touch') return 'Touch'
  if (range.rangeValue) return `${range.rangeValue} ft`
  return range.origin || '—'
}

function formatDuration(duration) {
  if (!duration) return '—'
  if (duration.durationType === 'Instantaneous') return 'Instant'
  if (duration.durationInterval && duration.durationUnit) {
    return `${duration.durationInterval} ${duration.durationUnit}`
  }
  return duration.durationType || '—'
}

function formatCastingTime(activation) {
  if (!activation) return '—'
  const map = { 1: 'Action', 3: 'Bonus Action', 4: 'Reaction', 6: 'Minute', 7: 'Hour' }
  const unit = map[activation.activationType] || ''
  const n = activation.activationTime || 1
  return unit ? `${n} ${unit}${n > 1 ? 's' : ''}` : '—'
}

function convertSpell(spell, sourceAbility) {
  const def = spell.definition || spell
  const components = (def.components || []).map((c) => SPELL_COMPONENT_MAP[c]).filter(Boolean)
  return {
    id: cryptoId(),
    name: def.name || 'Spell',
    level: num(def.level),
    school: def.school || '',
    castingTime: formatCastingTime(def.activation),
    range: formatRange(def.range),
    duration: formatDuration(def.duration),
    components: components.join(', '),
    materials: def.componentsDescription || '',
    concentration: !!def.concentration,
    ritual: !!def.ritual,
    prepared: spell.prepared ?? true,
    ability: sourceAbility || null,
    description: def.description || '',
  }
}

function parseSpells(ddb, classes) {
  const spells = []
  const seen = new Set()
  const primaryCaster = classes.find((c) => c.spellcastingAbility)
  const defaultAbility = primaryCaster?.spellcastingAbility || null

  const add = (list, ability) => {
    for (const s of list || []) {
      const converted = convertSpell(s, ability)
      const dedupeKey = `${converted.name}:${converted.level}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      spells.push(converted)
    }
  }

  // Class spell lists (known / prepared).
  for (const entry of ddb.classSpells || []) add(entry.spells, defaultAbility)

  // Spells granted by race / feat / item / background.
  const s = ddb.spells || {}
  add(s.class, defaultAbility)
  add(s.race, defaultAbility)
  add(s.feat, defaultAbility)
  add(s.item, defaultAbility)
  add(s.background, defaultAbility)

  spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
  return { spells, defaultAbility }
}

function parseSpellSlots(ddb, classes) {
  const slots = {}
  // Use the single primary caster's slot table; multiclass slot math is
  // approximate and easily adjusted in the UI.
  const caster = (ddb.classes || []).find((c) => c.definition?.canCastSpells)
  const table = caster?.definition?.spellRules?.levelSpellSlots
  const level = caster?.level
  if (Array.isArray(table) && level != null && Array.isArray(table[level])) {
    table[level].forEach((count, idx) => {
      const spellLevel = idx + 1
      if (count > 0) slots[String(spellLevel)] = { max: count, used: 0 }
    })
  }
  return slots
}

// ---- features -------------------------------------------------------------

function parseFeatures(ddb, classes) {
  const features = []

  // Racial traits.
  for (const trait of ddb.race?.racialTraits || []) {
    const def = trait.definition || {}
    if (!def.name) continue
    features.push({
      id: cryptoId(),
      name: def.name,
      source: ddb.race?.fullName || ddb.race?.baseRaceName || 'Race',
      level: null,
      description: def.description || '',
    })
  }

  // Class features at or below the character's level in that class.
  for (const c of ddb.classes || []) {
    const def = c.definition || {}
    const list = def.classFeatures || []
    for (const f of list) {
      const fdef = f.definition || f
      const required = num(fdef.requiredLevel, 1)
      if (required > (c.level || 1)) continue
      if (!fdef.name) continue
      features.push({
        id: cryptoId(),
        name: fdef.name,
        source: def.name || 'Class',
        level: required,
        description: fdef.description || '',
      })
    }
  }

  // Feats.
  for (const feat of ddb.feats || []) {
    const def = feat.definition || {}
    if (!def.name) continue
    features.push({
      id: cryptoId(),
      name: def.name,
      source: 'Feat',
      level: null,
      description: def.description || '',
    })
  }

  return features
}

// ---- weapon attacks -------------------------------------------------------

function parseAttacks(ddb, abilities, classes, proficiencyBonus) {
  const attacks = []
  const inventory = ddb.inventory || []

  for (const item of inventory) {
    const def = item.definition || {}
    const isWeapon = def.filterType === 'Weapon' || def.damage != null
    if (!isWeapon || !item.equipped) continue

    const props = (def.properties || []).map((p) => p.name)
    const finesse = props.includes('Finesse')
    const ranged = def.attackType === 2 || props.includes('Ammunition')

    let ability = 'str'
    if (ranged) ability = 'dex'
    if (finesse) ability = abilityModifier(abilities.dex) >= abilityModifier(abilities.str) ? 'dex' : 'str'

    const abilityMod = abilityModifier(abilities[ability])

    // Magic bonus from granted modifiers (e.g. a +1 weapon).
    const magicBonus = (def.grantedModifiers || [])
      .filter((m) => m.type === 'bonus' && (m.subType === 'magic' || m.subType === 'damage'))
      .reduce((s, m) => s + num(m.value), 0)
    const hitMagic = (def.grantedModifiers || [])
      .filter((m) => m.type === 'bonus' && m.subType === 'magic')
      .reduce((s, m) => s + num(m.value), 0)

    const toHit = abilityMod + proficiencyBonus + hitMagic
    const dmg = def.damage || {}
    attacks.push({
      id: cryptoId(),
      name: def.name || 'Weapon',
      source: 'Weapon',
      actionType: 'attack',
      ability,
      range: ranged ? `${def.range || 0}/${def.longRange || 0} ft` : '5 ft',
      toHitBonus: toHit,
      damage: dmg.diceCount
        ? [
            {
              count: num(dmg.diceCount, 1),
              sides: num(dmg.diceValue, 6),
              type: def.damageType || '',
              bonus: abilityMod + magicBonus - 0, // ability + magic to damage
            },
          ]
        : [],
      notes: props.join(', '),
    })
  }
  return attacks
}

// ---- main -----------------------------------------------------------------

export function parseDdbCharacter(rawJson) {
  const ddb = unwrap(rawJson)
  if (!ddb || (!ddb.stats && !ddb.name)) {
    throw new Error(
      'This does not look like a D&D Beyond character export. Make sure you pasted the full JSON.'
    )
  }

  const mods = collectModifiers(ddb)
  const abilities = parseAbilities(ddb, mods)
  const classes = parseClasses(ddb)
  const level = totalLevelOf(classes)
  const pb = Math.ceil(level / 4) + 1

  const character = createBlankCharacter()
  character.source = 'ddb'
  character.name = ddb.name || 'Imported Character'
  character.avatarUrl = ddb.decorations?.avatarUrl || ddb.avatarUrl || null
  character.race = ddb.race?.fullName || ddb.race?.baseRaceName || ''
  character.background = ddb.background?.definition?.name || ''
  character.alignment = ALIGNMENTS[ddb.alignmentId] || ''
  character.classes = classes

  character.abilities = abilities
  character.saveProficiencies = parseSaveProficiencies(mods)
  character.skillProficiencies = parseSkillProficiencies(mods)

  character.hp = parseHp(ddb, abilities, level, mods)
  character.ac = parseAC(ddb, abilities, classes, mods)
  character.speed = parseSpeed(ddb, mods)
  character.initiativeBonus = 0
  character.hitDice = classes.map((c) => ({ die: c.hitDie, total: c.level, used: 0 }))

  character.currencies = parseCurrencies(ddb)
  character.inventory = parseInventory(ddb)

  const { spells, defaultAbility } = parseSpells(ddb, classes)
  character.spellcasting = {
    ability: defaultAbility,
    slots: parseSpellSlots(ddb, classes),
    spells,
  }

  character.features = parseFeatures(ddb, classes)
  character.actions = parseAttacks(ddb, abilities, classes, pb)
  character.notes = ddb.notes?.backstory || ''

  return character
}

const ALIGNMENTS = {
  1: 'Lawful Good',
  2: 'Neutral Good',
  3: 'Chaotic Good',
  4: 'Lawful Neutral',
  5: 'True Neutral',
  6: 'Chaotic Neutral',
  7: 'Lawful Evil',
  8: 'Neutral Evil',
  9: 'Chaotic Evil',
}
