import { useState } from 'react'
import { useStore } from '../store/characterStore.js'
import { getMaxHp } from '../rules/derive.js'

const THEMES = [
  { key: 'ember', label: 'Ember', bg: '#1d1813', accent: '#c2562f' },
  { key: 'arcane', label: 'Arcane', bg: '#161833', accent: '#7b6cf0' },
  { key: 'forest', label: 'Forest', bg: '#14201a', accent: '#4f9d56' },
  { key: 'slate', label: 'Slate', bg: '#1a1e25', accent: '#4f93c7' },
  { key: 'parchment', label: 'Parchment', bg: '#f2e9d4', accent: '#9a3b2a' },
]

export default function CharacterMenu({ onClose, onEditDetails, onLevelUp }) {
  const character = useStore((s) => s.character)
  const updateCharacter = useStore((s) => s.updateCharacter)
  const clearCharacter = useStore((s) => s.clearCharacter)
  const [name, setName] = useState(character.name)
  const [confirmClear, setConfirmClear] = useState(false)

  const longRest = () => {
    updateCharacter((c) => {
      const max = getMaxHp(c)
      const slots = Object.fromEntries(
        Object.entries(c.spellcasting?.slots || {}).map(([k, v]) => [k, { ...v, used: 0 }])
      )
      const hitDice = (c.hitDice || []).map((hd) => {
        const regain = Math.max(1, Math.floor((hd.total || 0) / 2))
        return { ...hd, used: Math.max(0, (hd.used || 0) - regain) }
      })
      return {
        ...c,
        hp: { ...c.hp, current: max, temp: 0 },
        deathSaves: { successes: 0, failures: 0 },
        spellcasting: { ...c.spellcasting, slots },
        hitDice,
      }
    })
    onClose()
  }

  const saveName = () => updateCharacter((c) => ({ ...c, name: name.trim() || c.name }))

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(character, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(character.name || 'character').replace(/[^a-z0-9]+/gi, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet sheet--center" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <h3>Character</h3>
          <button className="btn btn--sm btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="sheet__body stack">
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} />
          </div>

          {onLevelUp && (
            <button className="btn btn--block" onClick={onLevelUp}>
              ⬆ Level Up
            </button>
          )}

          {onEditDetails && (
            <button className="btn btn--block" onClick={onEditDetails}>
              ✎ Edit class, race &amp; proficiencies
            </button>
          )}

          <Appearance />

          <button className="btn btn--primary btn--block" onClick={longRest}>
            🌙 Long Rest
          </button>
          <p className="faint tiny" style={{ marginTop: -4 }}>
            Restores HP to full, resets spell slots and death saves, and regains half your hit dice.
          </p>

          <button className="btn btn--block" onClick={exportJson}>
            ⬇ Export / back up (JSON)
          </button>

          {!confirmClear ? (
            <button className="btn btn--ghost btn--block btn--danger" onClick={() => setConfirmClear(true)}>
              Replace / remove character
            </button>
          ) : (
            <div className="callout" style={{ borderLeftColor: 'var(--bad)' }}>
              This clears the current character from this device. Export first if you want a backup.
              <div className="row" style={{ marginTop: 10 }}>
                <button
                  className="btn btn--sm btn--danger"
                  onClick={() => {
                    clearCharacter()
                    onClose()
                  }}
                >
                  Yes, remove
                </button>
                <button className="btn btn--sm btn--ghost" onClick={() => setConfirmClear(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Appearance() {
  const theme = useStore((s) => s.theme)
  const accent = useStore((s) => s.accent)
  const setTheme = useStore((s) => s.setTheme)
  const setAccent = useStore((s) => s.setAccent)

  const current = THEMES.find((t) => t.key === theme) || THEMES[0]
  const colorValue = accent || current.accent

  return (
    <div>
      <label className="field" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Appearance
        </span>
      </label>
      <div className="swatches">
        {THEMES.map((t) => (
          <button
            key={t.key}
            className={`swatch-btn ${t.key === theme ? 'is-active' : ''}`}
            onClick={() => setTheme(t.key)}
            aria-label={`${t.label} theme`}
          >
            <span className="swatch" style={{ background: t.bg }}>
              <span className="swatch__dot" style={{ background: t.accent }} />
            </span>
            <span className="swatch__label">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="row" style={{ gap: 10, marginTop: 10, alignItems: 'center' }}>
        <label className="row" style={{ gap: 8, alignItems: 'center' }}>
          <input
            type="color"
            value={colorValue}
            onChange={(e) => setAccent(e.target.value)}
            aria-label="Accent color"
            style={{ width: 38, height: 30, padding: 2, background: 'var(--bg)' }}
          />
          <span className="muted tiny">Accent color</span>
        </label>
        {accent && (
          <button className="btn btn--sm btn--ghost" onClick={() => setAccent(null)}>
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
