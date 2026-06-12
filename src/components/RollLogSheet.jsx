import { useStore } from '../store/characterStore.js'
import { describeRoll, rollVisual } from '../utils/rollFormat.js'
import { relativeTime } from '../utils/text.js'
import Die from './Die.jsx'

export default function RollLogSheet({ onClose }) {
  const rollLog = useStore((s) => s.rollLog)
  const clearLog = useStore((s) => s.clearLog)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <h3>Roll Log</h3>
          {rollLog.length > 0 && (
            <button className="btn btn--sm btn--ghost btn--danger" onClick={clearLog}>
              Clear
            </button>
          )}
          <button className="btn btn--sm btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="sheet__body">
          {rollLog.length === 0 ? (
            <p className="muted center">No rolls yet. Tap any stat, attack, or die to roll.</p>
          ) : (
            rollLog.map((entry) => {
              const cls = entry.isNat20 ? 'nat20' : entry.isNat1 ? 'nat1' : ''
              const tone = entry.isNat20 ? 'crit' : entry.isNat1 ? 'fail' : 'normal'
              const v = rollVisual(entry)
              return (
                <div key={entry.id} className="logitem">
                  {v.sides != null ? (
                    <Die sides={v.sides} value={v.dieValue} tone={tone} size={40} />
                  ) : (
                    <span className={`logitem__total ${cls}`}>{entry.total}</span>
                  )}
                  <span className="logitem__label">
                    <b>{entry.label}</b>
                    <span className="logitem__detail">{describeRoll(entry)}</span>
                  </span>
                  <span className="logitem__right">
                    {v.sides != null && <b className={`logitem__sum ${cls}`}>{entry.total}</b>}
                    <span className="logitem__time">{relativeTime(entry.ts)}</span>
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
