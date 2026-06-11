// A small, dependency-free dice engine.
//
// Supports:
//  - rolling individual dice (rollDie)
//  - rolling N dice of a kind (rollDice)
//  - parsing & evaluating dice expressions like "2d6+3", "1d20", "1d8 + 1d6 + 2"
//  - d20 checks with advantage / disadvantage and a flat modifier
//
// Every roll returns a structured result so the UI can show the breakdown
// (individual die faces, which were dropped, the modifier, and the total).

function randInt(max) {
  // Prefer the crypto RNG when available for nicer, less-biased rolls.
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(1)
    crypto.getRandomValues(arr)
    return (arr[0] % max) + 1
  }
  return Math.floor(Math.random() * max) + 1
}

export function rollDie(sides) {
  return randInt(sides)
}

// Roll `count` dice with `sides` faces. Returns { rolls: number[], total }.
export function rollDice(count, sides) {
  const rolls = []
  for (let i = 0; i < count; i++) rolls.push(rollDie(sides))
  return { rolls, total: rolls.reduce((a, b) => a + b, 0) }
}

// Parse a dice expression into tokens: dice groups ("NdM") and flat numbers.
// Whitespace-insensitive. Supports leading +/- on each term.
// Returns { terms: [{ kind:'dice'|'flat', sign, count, sides, value }], valid }.
export function parseExpression(expr) {
  if (!expr || typeof expr !== 'string') return { terms: [], valid: false }
  const cleaned = expr.replace(/\s+/g, '')
  if (!cleaned) return { terms: [], valid: false }

  const re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/gi
  const terms = []
  let lastIndex = 0
  let match
  while ((match = re.exec(cleaned)) !== null) {
    if (match.index !== lastIndex) return { terms: [], valid: false } // gap = garbage
    lastIndex = re.lastIndex
    if (match[3] !== undefined && match[3] !== '') {
      // dice term: [sign][count]d[sides]
      const sign = match[1] === '-' ? -1 : 1
      const count = match[2] === '' ? 1 : parseInt(match[2], 10)
      const sides = parseInt(match[3], 10)
      terms.push({ kind: 'dice', sign, count, sides })
    } else {
      // flat term
      const sign = match[4] === '-' ? -1 : 1
      const value = parseInt(match[5], 10)
      terms.push({ kind: 'flat', sign, value })
    }
  }
  if (lastIndex !== cleaned.length || terms.length === 0) {
    return { terms: [], valid: false }
  }
  return { terms, valid: true }
}

// Evaluate a parsed/raw expression into a full result with breakdown.
export function rollExpression(expr) {
  const parsed = typeof expr === 'string' ? parseExpression(expr) : expr
  if (!parsed.valid) return null
  let total = 0
  const breakdown = []
  for (const term of parsed.terms) {
    if (term.kind === 'dice') {
      const { rolls } = rollDice(term.count, term.sides)
      const sum = rolls.reduce((a, b) => a + b, 0) * term.sign
      total += sum
      breakdown.push({ kind: 'dice', sign: term.sign, count: term.count, sides: term.sides, rolls })
    } else {
      total += term.value * term.sign
      breakdown.push({ kind: 'flat', sign: term.sign, value: term.value })
    }
  }
  return { total, breakdown }
}

// A d20 check (ability check, save, skill, attack) with a modifier and
// optional advantage/disadvantage. mode: 'normal' | 'advantage' | 'disadvantage'.
export function rollD20({ modifier = 0, mode = 'normal' } = {}) {
  const first = rollDie(20)
  let dice = [first]
  let kept = first

  if (mode === 'advantage' || mode === 'disadvantage') {
    const second = rollDie(20)
    dice = [first, second]
    kept = mode === 'advantage' ? Math.max(first, second) : Math.min(first, second)
  }

  const total = kept + Number(modifier || 0)
  return {
    dice, // both raw d20 faces (one if normal)
    kept, // the face actually used
    modifier: Number(modifier || 0),
    mode,
    total,
    isNat20: kept === 20,
    isNat1: kept === 1,
  }
}

// Roll a flat pool of dice for damage/healing, e.g. (2, 6) -> 2d6.
export function rollDamage(count, sides, modifier = 0) {
  const { rolls, total } = rollDice(count, sides)
  return { rolls, modifier: Number(modifier || 0), total: total + Number(modifier || 0) }
}

// Roll arbitrary damage parts: [{count, sides, type}] + flat modifier.
// Returns total and a per-part breakdown (useful for typed damage later).
export function rollDamageParts(parts = [], modifier = 0) {
  let total = Number(modifier || 0)
  const detail = parts.map((p) => {
    const { rolls, total: sum } = rollDice(p.count || 1, p.sides || 6)
    total += sum
    return { ...p, rolls, sum }
  })
  return { total, modifier: Number(modifier || 0), parts: detail }
}
