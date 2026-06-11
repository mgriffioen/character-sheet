import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/characterStore.js'
import { describeRoll } from '../utils/rollFormat.js'
import RollLogSheet from './RollLogSheet.jsx'

const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100]

// Animate the headline total when a new roll lands: briefly tumble through
// random faces, then settle on the result with a pop. Skips the roll that's
// already present on load, and respects prefers-reduced-motion.
function useRollAnimation(roll) {
  const [display, setDisplay] = useState(roll ? roll.total : null)
  const [phase, setPhase] = useState('idle') // 'idle' | 'rolling' | 'settle'
  const seenId = useRef(roll?.id)

  useEffect(() => {
    if (!roll || roll.id === seenId.current) return
    seenId.current = roll.id

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setPhase('idle')
      return
    }

    setPhase('rolling')
    const cap = roll.kind === 'd20' ? 20 : Math.max(6, Math.abs(roll.total) || 6)
    let frames = 0
    let settleTimer
    const id = setInterval(() => {
      frames += 1
      setDisplay(1 + Math.floor(Math.random() * cap))
      if (frames >= 8) {
        clearInterval(id)
        setDisplay(roll.total)
        setPhase('settle')
        settleTimer = setTimeout(() => setPhase('idle'), 350)
      }
    }, 45)
    return () => {
      clearInterval(id)
      clearTimeout(settleTimer)
    }
  }, [roll?.id, roll?.total, roll?.kind])

  // When not actively tumbling, always show the true total.
  return { display: phase === 'rolling' ? display : roll ? roll.total : null, phase }
}

export default function DiceTray() {
  const rollMode = useStore((s) => s.rollMode)
  const setRollMode = useStore((s) => s.setRollMode)
  const rollFormula = useStore((s) => s.rollFormula)
  const lastRoll = useStore((s) => s.rollLog[0])
  const [logOpen, setLogOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)

  const { display, phase } = useRollAnimation(lastRoll)
  const natClass =
    phase !== 'rolling' ? (lastRoll?.isNat20 ? 'nat20' : lastRoll?.isNat1 ? 'nat1' : '') : ''
  const motionClass = phase === 'rolling' ? 'is-rolling' : phase === 'settle' ? 'settle' : ''
  const lastClass = `${natClass} ${motionClass}`.trim()

  return (
    <>
      <div className="tray">
        <div className="tray__main">
          <div className="mode-toggle" role="group" aria-label="Roll mode">
            <button
              className={`dis ${rollMode === 'disadvantage' ? 'is-active' : ''}`}
              onClick={() => setRollMode(rollMode === 'disadvantage' ? 'normal' : 'disadvantage')}
              aria-label="Disadvantage"
              title="Disadvantage"
            >
              −
            </button>
            <button
              className={`norm ${rollMode === 'normal' ? 'is-active' : ''}`}
              onClick={() => setRollMode('normal')}
              aria-label="Normal"
              title="Normal"
            >
              ●
            </button>
            <button
              className={`adv ${rollMode === 'advantage' ? 'is-active' : ''}`}
              onClick={() => setRollMode(rollMode === 'advantage' ? 'normal' : 'advantage')}
              aria-label="Advantage"
              title="Advantage"
            >
              +
            </button>
          </div>

          <button className="last-roll" onClick={() => setLogOpen(true)}>
            {lastRoll ? (
              <>
                <span className={`last-roll__total ${lastClass}`}>{display}</span>
                <span className="last-roll__meta">
                  <span className="last-roll__label">
                    {phase === 'rolling' ? 'Rolling…' : lastRoll.label}
                  </span>
                  <span className="last-roll__detail">{describeRoll(lastRoll)}</span>
                </span>
              </>
            ) : (
              <span className="last-roll__empty">Tap a stat or a die to roll…</span>
            )}
          </button>
        </div>

        <div className="tray__dice">
          {QUICK_DICE.map((d) => (
            <button
              key={d}
              className="die-btn"
              onClick={() => rollFormula({ label: `d${d}`, expression: `1d${d}`, type: 'die' })}
            >
              d{d}
            </button>
          ))}
          <button className="die-btn" onClick={() => setCustomOpen(true)} aria-label="Custom roll">
            ⋯
          </button>
        </div>
      </div>

      {logOpen && <RollLogSheet onClose={() => setLogOpen(false)} />}
      {customOpen && <CustomRoll onClose={() => setCustomOpen(false)} />}
    </>
  )
}

function CustomRoll({ onClose }) {
  const rollFormula = useStore((s) => s.rollFormula)
  const [expr, setExpr] = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    const res = rollFormula({ label: expr || 'Custom', expression: expr, type: 'custom' })
    if (!res) {
      setError('Could not parse that. Try things like 2d6+3, 1d20, 4d6+1d4.')
      return
    }
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet sheet--center" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <h3>Custom roll</h3>
          <button className="btn btn--sm btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="sheet__body">
          <input
            autoFocus
            inputMode="text"
            placeholder="e.g. 2d6+3"
            value={expr}
            onChange={(e) => {
              setExpr(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            style={{ width: '100%', fontSize: 20, textAlign: 'center' }}
          />
          {error && <p className="error-text">{error}</p>}
          <div className="row row--wrap" style={{ marginTop: 12 }}>
            {['1d20', '2d6+3', '1d8+3', '8d6', '1d100'].map((p) => (
              <button key={p} className="btn btn--sm" onClick={() => setExpr(p)}>
                {p}
              </button>
            ))}
          </div>
          <button className="btn btn--primary btn--block" style={{ marginTop: 14 }} onClick={submit}>
            Roll
          </button>
        </div>
      </div>
    </div>
  )
}
