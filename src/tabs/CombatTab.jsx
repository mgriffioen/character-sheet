import { useState } from 'react'
import { useStore } from '../store/characterStore.js'
import { getAC, getMaxHp } from '../rules/derive.js'
import { signed } from '../rules/dnd.js'

export default function CombatTab() {
  const character = useStore((s) => s.character)
  const adjustHp = useStore((s) => s.adjustHp)
  const setTempHp = useStore((s) => s.setTempHp)
  const setOverride = useStore((s) => s.setOverride)
  const [amount, setAmount] = useState('')

  const maxHp = getMaxHp(character)
  const curHp = character.hp?.current ?? maxHp
  const temp = character.hp?.temp || 0

  const apply = (sign) => {
    const n = parseInt(amount, 10)
    if (!n) return
    adjustHp(sign * Math.abs(n))
    setAmount('')
  }

  return (
    <>
      {/* Hit points */}
      <div className="card">
        <div className="card__title">Hit Points</div>
        <div style={{ padding: '6px 14px 14px' }}>
          <div className="row" style={{ justifyContent: 'center', gap: 6, margin: '4px 0 10px' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 44, lineHeight: 1 }}>
              {curHp}
            </span>
            <span className="muted" style={{ fontSize: 22 }}>
              / {maxHp}
            </span>
            {temp > 0 && (
              <span className="badge badge--accent" style={{ alignSelf: 'center' }}>
                +{temp} temp
              </span>
            )}
          </div>

          <div className="hp-editor">
            <input
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              aria-label="HP amount"
            />
            <button className="btn btn--danger" style={{ flex: 1 }} onClick={() => apply(-1)}>
              Damage
            </button>
            <button className="btn" style={{ flex: 1, color: 'var(--good)' }} onClick={() => apply(1)}>
              Heal
            </button>
          </div>

          <div className="hp-adjust">
            {[-5, -1, 1, 5].map((d) => (
              <button key={d} className="btn btn--sm" onClick={() => adjustHp(d)}>
                {d > 0 ? `+${d}` : d}
              </button>
            ))}
            <TempHpButton temp={temp} setTempHp={setTempHp} />
          </div>
        </div>
      </div>

      {curHp <= 0 && <DeathSaves />}

      {/* Defenses quick-edit */}
      <div className="card">
        <div className="card__title">Defenses</div>
        <div className="row" style={{ padding: '8px 14px 14px', gap: 16 }}>
          <EditStat
            label="Armor Class"
            value={getAC(character)}
            onChange={(v) => setOverride('ac', v)}
          />
          <EditStat
            label="Max HP"
            value={maxHp}
            onChange={(v) => setOverride('hpMax', v)}
          />
        </div>
      </div>

      <Attacks />
    </>
  )
}

function TempHpButton({ temp, setTempHp }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  if (!editing) {
    return (
      <button className="btn btn--sm" onClick={() => { setEditing(true); setVal(String(temp || '')) }}>
        Temp HP
      </button>
    )
  }
  return (
    <input
      autoFocus
      inputMode="numeric"
      style={{ width: 80 }}
      value={val}
      onChange={(e) => setVal(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={() => { setTempHp(val); setEditing(false) }}
      onKeyDown={(e) => e.key === 'Enter' && (setTempHp(val), setEditing(false))}
      placeholder="Temp HP"
    />
  )
}

function EditStat({ label, value, onChange }) {
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label>{label}</label>
      <input
        inputMode="numeric"
        style={{ width: 80, fontSize: 20, textAlign: 'center' }}
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
        onFocus={(e) => e.target.select()}
      />
    </div>
  )
}

function DeathSaves() {
  const character = useStore((s) => s.character)
  const setDeathSaves = useStore((s) => s.setDeathSaves)
  const rollCheck = useStore((s) => s.rollCheck)
  const ds = character.deathSaves || { successes: 0, failures: 0 }

  const setCount = (kind, n) =>
    setDeathSaves({ ...ds, [kind]: ds[kind] === n ? n - 1 : n })

  return (
    <div className="card">
      <div className="card__title">Death Saves</div>
      <div style={{ padding: '8px 14px 14px' }}>
        <DeathRow label="Successes" count={ds.successes} cls="is-prof" onSet={(n) => setCount('successes', n)} />
        <DeathRow label="Failures" count={ds.failures} cls="is-half" onSet={(n) => setCount('failures', n)} />
        <button
          className="btn btn--block"
          style={{ marginTop: 10 }}
          onClick={() => rollCheck({ label: 'Death Save', modifier: 0, type: 'death', mode: 'normal' })}
        >
          Roll death save (d20)
        </button>
      </div>
    </div>
  )
}

function DeathRow({ label, count, cls, onSet }) {
  return (
    <div className="row" style={{ margin: '6px 0' }}>
      <span className="muted" style={{ flex: 1 }}>{label}</span>
      <div className="row" style={{ gap: 8 }}>
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            className={`prof-dot ${count >= n ? cls : ''}`}
            style={{ width: 22, height: 22 }}
            onClick={() => onSet(n)}
            aria-label={`${label} ${n}`}
          />
        ))}
      </div>
    </div>
  )
}

function Attacks() {
  const character = useStore((s) => s.character)
  const rollCheck = useStore((s) => s.rollCheck)
  const rollDamage = useStore((s) => s.rollDamage)
  const attacks = character.actions?.filter((a) => a.actionType === 'attack') || []

  if (attacks.length === 0) {
    return (
      <div className="card">
        <div className="card__title">Attacks</div>
        <p className="muted" style={{ padding: '4px 14px 14px' }}>
          No weapon attacks detected. Equip a weapon in D&amp;D Beyond and re-import, or add attacks
          here in a future update.
        </p>
      </div>
    )
  }

  const damageText = (a) =>
    a.damage
      .map((d) => `${d.count}d${d.sides}${d.bonus ? signed(d.bonus) : ''}`)
      .join(' + ') || '—'

  return (
    <div className="card">
      <div className="card__title">Attacks &amp; Actions</div>
      {attacks.map((a) => (
        <div className="attack" key={a.id}>
          <span className="attack__name">
            <b>{a.name}</b>
            <small>
              {a.range}
              {a.damage[0]?.type ? ` • ${a.damage[0].type}` : ''}
            </small>
          </span>
          <button
            className="attack__btn"
            onClick={() => rollCheck({ label: `${a.name} — to hit`, modifier: a.toHitBonus, type: 'attack' })}
          >
            <small>HIT</small>
            <b>{signed(a.toHitBonus)}</b>
          </button>
          <button
            className="attack__btn"
            onClick={() => rollDamage({ label: `${a.name} — damage`, parts: a.damage })}
          >
            <small>DMG</small>
            <b>{damageText(a)}</b>
          </button>
          {a.damage.length > 0 && (
            <button
              className="attack__btn"
              style={{ minWidth: 40 }}
              title="Critical hit (double dice)"
              onClick={() => rollDamage({ label: `${a.name} — damage`, parts: a.damage, crit: true })}
            >
              <small>CRIT</small>
              <b>⚡</b>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
