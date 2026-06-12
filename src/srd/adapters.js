// Convert SRD API entries into the app's internal models so compendium content
// can be added straight to a character.

import { cryptoId } from '../model/character.js'
import { srdDetail } from './api.js'

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

// SRD class/subclass feature -> internal feature model.
export function srdFeatureToModel(f) {
  return {
    id: cryptoId(),
    name: f.name || 'Feature',
    source: f.class?.name || f.subclass?.name || 'Feature',
    level: f.level ?? null,
    description: joinDesc(f.desc),
  }
}

// Build feature models for a subclass up to `maxLevel`, each enriched with its
// full description. The subclass-levels endpoint only yields feature references
// ({index,name,url}), so we fetch each one's detail for `desc`. Detail fetches
// run in parallel and are cached; a feature whose detail can't be reached is
// kept name-only so the rest still come through.
export async function subclassFeatureModels(subclassIndex, subclassName, maxLevel) {
  const levels = await srdDetail(`/api/subclasses/${subclassIndex}/levels`)
  if (!Array.isArray(levels)) return []
  const refs = []
  for (const lvl of levels) {
    if ((lvl.level || 0) > maxLevel) continue
    for (const f of lvl.features || []) {
      if (f.name) refs.push({ name: f.name, url: f.url, level: lvl.level })
    }
  }
  return Promise.all(
    refs.map(async (ref) => {
      let description = ''
      if (ref.url) {
        try {
          description = joinDesc((await srdDetail(ref.url)).desc)
        } catch {
          /* keep this feature name-only */
        }
      }
      return { id: cryptoId(), name: ref.name, source: subclassName, level: ref.level, description }
    })
  )
}

// Open5e feat -> internal feature model.
export function open5eFeatToModel(feat) {
  const prereq = feat.prerequisite ? `Prerequisite: ${feat.prerequisite}\n\n` : ''
  const effects = Array.isArray(feat.effects_desc) ? feat.effects_desc.join('\n\n') : ''
  return {
    id: cryptoId(),
    name: feat.name || 'Feat',
    source: 'Feat',
    level: null,
    description: prereq + (feat.desc || '') + (effects ? `\n\n${effects}` : ''),
  }
}

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
