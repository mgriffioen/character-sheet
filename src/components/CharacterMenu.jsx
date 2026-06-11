import { useState } from 'react'
import { useStore } from '../store/characterStore.js'
import { getMaxHp } from '../rules/derive.js'

export default function CharacterMenu({ onClose }) {
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
