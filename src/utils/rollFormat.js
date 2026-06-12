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

// Decide how to visualize a roll as a single shaped die: which die shape to
// draw (`sides`), the natural dice value to show on its face (`dieValue`,
// pre-modifier), and the final `total`. `sides` is null when there were no
// dice (a flat value), in which case just the number is shown.
export function rollVisual(entry) {
  if (!entry) return { sides: null, dieValue: null, total: null }

  if (entry.kind === 'd20') {
    return { sides: 20, dieValue: entry.kept, total: entry.total }
  }

  if (entry.kind === 'formula') {
    let sides = null
    let sum = 0
    let hasDice = false
    for (const t of entry.breakdown || []) {
      if (t.kind === 'dice') {
        hasDice = true
        sides = Math.max(sides ?? 0, t.sides)
        sum += t.rolls.reduce((a, b) => a + b, 0) * (t.sign < 0 ? -1 : 1)
      }
    }
    return { sides: hasDice ? sides : null, dieValue: hasDice ? sum : null, total: entry.total }
  }

  if (entry.kind === 'damage') {
    let sides = null
    let sum = 0
    let hasDice = false
    for (const p of entry.parts || []) {
      if (p.count > 0) {
        hasDice = true
        sides = Math.max(sides ?? 0, p.sides)
        sum += p.rolls.reduce((a, b) => a + b, 0)
      }
    }
    return { sides: hasDice ? sides : null, dieValue: hasDice ? sum : null, total: entry.total }
  }

  return { sides: null, dieValue: entry.total, total: entry.total }
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
