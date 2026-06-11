import { useState } from 'react'
import { useStore } from '../store/characterStore.js'
import { getAC, getMaxHp } from '../rules/derive.js'
import { signed } from '../rules/dnd.js'
import { cryptoId } from '../model/character.js'
import { formatDamageParts } from '../utils/rollFormat.js'

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
  // `null` = closed; an attack object = edit it; 'new' = add a fresh one.
  const [editing, setEditing] = useState(null)

  return (
    <div className="card">
      <div className="card__title">
        Attacks &amp; Actions
        <button className="btn btn--sm" onClick={() => setEditing('new')}>
          + Add
        </button>
      </div>

      {attacks.length === 0 && (
        <p className="muted" style={{ padding: '4px 14px 14px' }}>
          No attacks yet. Tap <b>+ Add</b>, or import a character from D&amp;D Beyond.
        </p>
      )}

      {attacks.map((a) => (
        <div className="attack" key={a.id}>
          <button className="attack__name attack__name--edit" onClick={() => setEditing(a)}>
            <b>
              {a.name} <span className="edit-glyph">✎</span>
            </b>
            <small>
              {a.range}
              {a.damage[0]?.type ? ` • ${a.damage[0].type}` : ''}
            </small>
          </button>
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
            <b>{formatDamageParts(a.damage)}</b>
          </button>
          <button
            className="attack__btn"
            style={{ minWidth: 40 }}
            title="Critical hit (double dice)"
            onClick={() => rollDamage({ label: `${a.name} — damage`, parts: a.damage, crit: true })}
          >
            <small>CRIT</small>
            <b>⚡</b>
          </button>
        </div>
      ))}

      {editing && (
        <AttackEditor
          attack={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function AttackEditor({ attack, onClose }) {
  const upsertAttack = useStore((s) => s.upsertAttack)
  const removeAttack = useStore((s) => s.removeAttack)
  const isNew = !attack
  const part = attack?.damage?.[0] || { count: 1, sides: 6, bonus: 0, type: '' }

  const [name, setName] = useState(attack?.name || '')
  const [toHit, setToHit] = useState(String(attack?.toHitBonus ?? 0))
  const [count, setCount] = useState(String(part.count ?? 1))
  const [sides, setSides] = useState(String(part.sides ?? 6))
  const [bonus, setBonus] = useState(String(part.bonus ?? 0))
  const [type, setType] = useState(part.type || '')
  const [range, setRange] = useState(attack?.range || '5 ft')

  const save = () => {
    const c = parseInt(count, 10) || 0
    const s = parseInt(sides, 10) || 0
    const b = parseInt(bonus, 10) || 0
    const damage = c > 0 || b !== 0 ? [{ count: c, sides: c > 0 ? s : 0, type: type.trim(), bonus: b }] : []
    upsertAttack({
      id: attack?.id || cryptoId(),
      name: name.trim() || 'Attack',
      source: attack?.source || 'Custom',
      actionType: 'attack',
      ability: attack?.ability || null,
      range: range.trim() || '—',
      toHitBonus: parseInt(toHit, 10) || 0,
      damage,
      notes: attack?.notes || '',
    })
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet sheet--center" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <h3>{isNew ? 'Add attack' : 'Edit attack'}</h3>
          <button className="btn btn--sm btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="sheet__body">
          <div className="field">
            <label>Name</label>
            <input value={name} autoFocus onChange={(e) => setName(e.target.value)} placeholder="e.g. Lantern-Flail" />
          </div>

          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>To hit</label>
              <IntInput value={toHit} onChange={setToHit} allowNegative />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Range</label>
              <input value={range} onChange={(e) => setRange(e.target.value)} />
            </div>
          </div>

          <label className="field" style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Damage
            </span>
          </label>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <IntInput value={count} onChange={setCount} style={{ width: 52 }} />
            <span className="muted">d</span>
            <IntInput value={sides} onChange={setSides} style={{ width: 56 }} />
            <span className="muted">+</span>
            <IntInput value={bonus} onChange={setBonus} allowNegative style={{ width: 56 }} />
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="type"
              style={{ flex: 1, minWidth: 0 }}
            />
          </div>
          <p className="faint tiny" style={{ marginTop: 6 }}>
            Tip: set dice count to 0 for a flat hit (e.g. Unarmed Strike → 0 d 0 + 2).
          </p>

          <button className="btn btn--primary btn--block" style={{ marginTop: 14 }} onClick={save}>
            {isNew ? 'Add attack' : 'Save'}
          </button>
          {!isNew && (
            <button
              className="btn btn--ghost btn--block btn--danger"
              style={{ marginTop: 8 }}
              onClick={() => {
                removeAttack(attack.id)
                onClose()
              }}
            >
              Delete attack
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Numeric text input that keeps only digits (and an optional leading minus).
function IntInput({ value, onChange, allowNegative = false, style }) {
  const clean = (raw) => {
    let v = raw.replace(allowNegative ? /[^0-9-]/g : /[^0-9]/g, '')
    if (allowNegative) v = v.replace(/(?!^)-/g, '')
    return v
  }
  return (
    <input
      inputMode={allowNegative ? 'text' : 'numeric'}
      value={value}
      onChange={(e) => onChange(clean(e.target.value))}
      onFocus={(e) => e.target.select()}
      style={{ textAlign: 'center', ...style }}
    />
  )
}
