// Produce a compact, human-readable breakdown string for a roll log entry.
import { signed } from '../rules/dnd.js'

export function describeRoll(entry) {
  if (!entry) return ''
  if (entry.kind === 'd20') {
    const mod = entry.modifier ? ` ${signed(entry.modifier)}` : ''
    if (entry.mode === 'advantage' || entry.mode === 'disadvantage') {
      const tag = entry.mode === 'advantage' ? 'adv' : 'dis'
      const faces = entry.dice.join(', ')
      return `${tag} (${faces}) → ${entry.kept}${mod}`
    }
    return `d20: ${entry.kept}${mod}`
  }
  if (entry.kind === 'formula') {
    return formatBreakdown(entry.breakdown)
  }
  if (entry.kind === 'damage') {
    const parts = (entry.parts || [])
      .filter((p) => p.count > 0)
      .map((p) => `${p.count}d${p.sides}[${p.rolls.join(',')}]${p.type ? ` ${p.type}` : ''}`)
      .join(' + ')
    const mod = entry.modifier ? ` ${signed(entry.modifier)}` : ''
    if (!parts) return `${entry.modifier}` // flat damage (e.g. Unarmed Strike)
    return `${parts}${mod}`
  }
  return ''
}

// Render a damage definition ([{count,sides,type,bonus}]) as text, e.g.
// "1d4+2", "1d6", or "2" for a flat (no-die) hit. Used on attack buttons.
export function formatDamageParts(parts) {
  if (!parts || !parts.length) return '—'
  const out = parts
    .map((d) => {
      const dice = d.count > 0 ? `${d.count}d${d.sides}` : ''
      if (d.bonus) return dice ? `${dice}${signed(d.bonus)}` : `${d.bonus}`
      return dice
    })
    .filter(Boolean)
  return out.join(' + ') || '0'
}

function formatBreakdown(breakdown = []) {
  return breakdown
    .map((t) => {
      const sign = t.sign < 0 ? '−' : ''
      if (t.kind === 'dice') {
        return `${sign}${t.count}d${t.sides}[${t.rolls.join(',')}]`
      }
      return `${sign}${t.value}`
    })
    .join(' + ')
    .replace(/\+ −/g, '− ')
}
