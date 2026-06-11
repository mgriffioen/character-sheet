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
      .map((p) => `${p.count}d${p.sides}[${p.rolls.join(',')}]${p.type ? ` ${p.type}` : ''}`)
      .join(' + ')
    const mod = entry.modifier ? ` ${signed(entry.modifier)}` : ''
    return `${parts}${mod}`
  }
  return ''
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
