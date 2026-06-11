import { useState } from 'react'
import { useStore } from '../store/characterStore.js'
import { totalLevel } from '../model/character.js'
import { ABILITIES, ABILITY_NAMES } from '../rules/dnd.js'

const ALIGNMENTS = [
  'Lawful Good',
  'Neutral Good',
  'Chaotic Good',
  'Lawful Neutral',
  'True Neutral',
  'Chaotic Neutral',
  'Lawful Evil',
  'Neutral Evil',
  'Chaotic Evil',
]

const PROF_GROUPS = [
  { key: 'languages', label: 'Languages' },
  { key: 'armor', label: 'Armor' },
  { key: 'weapons', label: 'Weapons' },
  { key: 'tools', label: 'Tools' },
]

export default function CharacterEditor({ onClose }) {
  const character = useStore((s) => s.character)
  const updateCharacter = useStore((s) => s.updateCharacter)

  const set = (patch) => updateCharacter((c) => ({ ...c, ...patch }))

  const setClass = (i, patch) =>
    updateCharacter((c) => ({
      ...c,
      classes: c.classes.map((cl, idx) => (idx === i ? { ...cl, ...patch } : cl)),
    }))
  const addClass = () =>
    updateCharacter((c) => ({
      ...c,
      classes: [...(c.classes || []), { name: 'New Class', level: 1, subclass: '', spellcastingAbility: null }],
    }))
  const removeClass = (i) =>
    updateCharacter((c) => ({ ...c, classes: c.classes.filter((_, idx) => idx !== i) }))

  const addProf = (group, raw) => {
    const v = raw.trim()
    if (!v) return
    updateCharacter((c) => {
      const cur = c.proficiencies?.[group] || []
      if (cur.some((x) => x.toLowerCase() === v.toLowerCase())) return c
      return { ...c, proficiencies: { ...c.proficiencies, [group]: [...cur, v] } }
    })
  }
  const removeProf = (group, val) =>
    updateCharacter((c) => ({
      ...c,
      proficiencies: { ...c.proficiencies, [group]: (c.proficiencies?.[group] || []).filter((x) => x !== val) },
    }))

  return (
    <div className="fsheet">
      <div className="fsheet__head">
        <h3>Character Details</h3>
        <span className="spacer" />
        <button className="btn btn--sm btn--primary" onClick={onClose}>
          Done
        </button>
      </div>

      <div className="fsheet__body">
        {/* Identity */}
        <div className="edit-section">
          <h4>Identity</h4>
          <div className="field">
            <label>Name</label>
            <input value={character.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Race</label>
              <input value={character.race} onChange={(e) => set({ race: e.target.value })} placeholder="e.g. Half-Elf" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Background</label>
              <input
                value={character.background}
                onChange={(e) => set({ background: e.target.value })}
                placeholder="e.g. Soldier"
              />
            </div>
          </div>
          <div className="field">
            <label>Alignment</label>
            <select value={character.alignment || ''} onChange={(e) => set({ alignment: e.target.value })}>
              <option value="">—</option>
              {ALIGNMENTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Classes */}
        <div className="edit-section">
          <h4>
            Classes
            <span className="faint tiny" style={{ textTransform: 'none', letterSpacing: 0 }}>
              Total level {totalLevel(character)}
            </span>
          </h4>
          {(character.classes || []).map((cl, i) => (
            <div className="class-edit" key={i}>
              <div className="row" style={{ gap: 10 }}>
                <div className="field" style={{ flex: 2, marginBottom: 8 }}>
                  <label>Class</label>
                  <input value={cl.name} onChange={(e) => setClass(i, { name: e.target.value })} />
                </div>
                <div className="field" style={{ width: 72, marginBottom: 8 }}>
                  <label>Level</label>
                  <input
                    inputMode="numeric"
                    value={cl.level}
                    onChange={(e) =>
                      setClass(i, { level: Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)) })
                    }
                    onFocus={(e) => e.target.select()}
                    style={{ textAlign: 'center' }}
                  />
                </div>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <div className="field" style={{ flex: 2, marginBottom: 8 }}>
                  <label>Subclass</label>
                  <input
                    value={cl.subclass || ''}
                    onChange={(e) => setClass(i, { subclass: e.target.value })}
                    placeholder="optional"
                  />
                </div>
                <div className="field" style={{ flex: 1, marginBottom: 8 }}>
                  <label>Spellcasting</label>
                  <select
                    value={cl.spellcastingAbility || ''}
                    onChange={(e) => setClass(i, { spellcastingAbility: e.target.value || null })}
                  >
                    <option value="">None</option>
                    {ABILITIES.map((a) => (
                      <option key={a} value={a}>
                        {ABILITY_NAMES[a].slice(0, 3)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button className="btn btn--sm btn--ghost btn--danger" onClick={() => removeClass(i)}>
                Remove class
              </button>
            </div>
          ))}
          <button className="btn btn--sm" style={{ marginTop: 12 }} onClick={addClass}>
            + Add class
          </button>
        </div>

        {/* Movement */}
        <div className="edit-section">
          <h4>Movement</h4>
          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ width: 110, marginBottom: 0 }}>
              <label>Speed (ft)</label>
              <input
                inputMode="numeric"
                value={character.speed}
                onChange={(e) => set({ speed: parseInt(e.target.value, 10) || 0 })}
                onFocus={(e) => e.target.select()}
                style={{ textAlign: 'center' }}
              />
            </div>
            <div className="field" style={{ width: 110, marginBottom: 0 }}>
              <label>Initiative+</label>
              <input
                inputMode="numeric"
                value={character.initiativeBonus || 0}
                onChange={(e) => set({ initiativeBonus: parseInt(e.target.value, 10) || 0 })}
                onFocus={(e) => e.target.select()}
                style={{ textAlign: 'center' }}
              />
            </div>
          </div>
          <p className="faint tiny" style={{ marginTop: 8 }}>
            Changing class or level updates your proficiency bonus, saves, and skills automatically.
            HP and spell slots are tracked manually (Combat / Spells tabs).
          </p>
        </div>

        {/* Proficiencies */}
        <div className="edit-section">
          <h4>Proficiencies</h4>
          {PROF_GROUPS.map((g) => (
            <ChipGroup
              key={g.key}
              label={g.label}
              items={character.proficiencies?.[g.key] || []}
              onAdd={(v) => addProf(g.key, v)}
              onRemove={(v) => removeProf(g.key, v)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ChipGroup({ label, items, onAdd, onRemove }) {
  const [val, setVal] = useState('')
  const submit = () => {
    onAdd(val)
    setVal('')
  }
  return (
    <div className="field">
      <label>{label}</label>
      {items.length > 0 && (
        <div className="chips-edit">
          {items.map((it) => (
            <span className="chip-sm" key={it}>
              {it}
              <button onClick={() => onRemove(it)} aria-label={`Remove ${it}`}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="row" style={{ gap: 8 }}>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={`Add ${label.toLowerCase().replace(/s$/, '')}…`}
          style={{ flex: 1, minWidth: 0 }}
        />
        <button className="btn btn--sm" onClick={submit}>
          Add
        </button>
      </div>
    </div>
  )
}
