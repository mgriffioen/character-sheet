// Renders the dice portion of a roll result:
//  - advantage / disadvantage: both d20s, the kept one bright, the dropped one
//    dimmed (so it's obvious two dice were rolled and which counted);
//  - a multi-die roll (e.g. 8d6): the primary die with a "×N" count badge;
//  - a single die: just that die;
//  - a flat value (no dice): the bare number.
import Die from './Die.jsx'

export default function RollDice({ visual, value, tone = 'normal', size = 46, rolling = false, settle = false }) {
  if (!visual || visual.sides == null) {
    const cls = tone === 'crit' ? 'nat20' : tone === 'fail' ? 'nat1' : ''
    return <span className={`last-roll__total ${cls}`.trim()}>{value}</span>
  }

  // Advantage / disadvantage: show the pair.
  if (visual.faces && visual.faces.length === 2) {
    const small = Math.round(size * 0.74)
    return (
      <span className="dice-pair" title={visual.mode}>
        <Die
          sides={20}
          value={value}
          tone={tone}
          size={size}
          rolling={rolling}
          settle={settle}
        />
        <Die sides={20} value={visual.dropped} tone="normal" size={small} dimmed />
      </span>
    )
  }

  // Single / multi-die: one shaped die, with a count badge when more than one.
  return (
    <span className="die-wrap">
      <Die sides={visual.sides} value={value} tone={tone} size={size} rolling={rolling} settle={settle} />
      {visual.diceCount > 1 && <span className="die-count">×{visual.diceCount}</span>}
    </span>
  )
}
