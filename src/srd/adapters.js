// Convert SRD API entries into the app's internal models so compendium content
// can be added straight to a character.

import { cryptoId } from '../model/character.js'

function joinDesc(desc) {
  if (Array.isArray(desc)) return desc.join('\n\n')
  return desc || ''
}

// SRD spell -> internal spell model.
export function srdSpellToModel(s, ability = null) {
  const higher =
    Array.isArray(s.higher_level) && s.higher_level.length
      ? `\n\nAt Higher Levels: ${s.higher_level.join(' ')}`
      : ''
  return {
    id: cryptoId(),
    name: s.name || 'Spell',
    level: Number(s.level) || 0,
    school: s.school?.name || '',
    castingTime: s.casting_time || '',
    range: s.range || '',
    duration: s.duration || '',
    components: Array.isArray(s.components) ? s.components.join(', ') : '',
    materials: s.material || '',
    concentration: !!s.concentration,
    ritual: !!s.ritual,
    prepared: true,
    ability: ability || null,
    description: joinDesc(s.desc) + higher,
    source: 'SRD',
  }
}

// SRD equipment or magic item -> internal inventory item model.
export function srdItemToModel(it) {
  const categoryIndex = it.equipment_category?.index
  const isWeapon = categoryIndex === 'weapon' || !!it.damage
  const isArmor = categoryIndex === 'armor' || !!it.armor_class
  let type = it.equipment_category?.name || 'Gear'
  if (isWeapon) type = 'Weapon'
  else if (isArmor) type = 'Armor'

  // Magic items expose a `rarity` object; mundane equipment does not.
  const rarity = it.rarity?.name || null

  return {
    id: cryptoId(),
    name: it.name || 'Item',
    type,
    quantity: 1,
    weight: Number(it.weight) || 0,
    equipped: false,
    attuned: false,
    rarity,
    magic: !!it.rarity,
    description: joinDesc(it.desc),
  }
}
