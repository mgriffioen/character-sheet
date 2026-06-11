import { useState } from 'react'
import { useStore } from '../store/characterStore.js'
import { describeRoll } from '../utils/rollFormat.js'
import RollLogSheet from './RollLogSheet.jsx'

const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100]

export default function DiceTray() {
  const rollMode = useStore((s) => s.rollMode)
  const setRollMode = useStore((s) => s.setRollMode)
  const rollFormula = useStore((s) => s.rollFormula)
  const lastRoll = useStore((s) => s.rollLog[0])
  const [logOpen, setLogOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)

  const lastClass = lastRoll?.isNat20 ? 'nat20' : lastRoll?.isNat1 ? 'nat1' : ''

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
                <span className={`last-roll__total ${lastClass}`}>{lastRoll.total}</span>
                <span className="last-roll__meta">
                  <span className="last-roll__label">{lastRoll.label}</span>
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
