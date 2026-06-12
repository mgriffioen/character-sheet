import { useState } from 'react'
import { useStore } from '../store/characterStore.js'
import { getSpellSaveDC, getSpellAttackBonus } from '../rules/derive.js'
import { ABILITY_NAMES, signed, fullCasterSlots } from '../rules/dnd.js'
import { totalLevel } from '../model/character.js'
import { toParagraphs } from '../utils/text.js'

const LEVEL_LABEL = (lvl) => (lvl === 0 ? 'Cantrips' : `Level ${lvl}`)

export default function SpellsTab() {
  const character = useStore((s) => s.character)
  const setSlotUsed = useStore((s) => s.setSlotUsed)
  const [slotsOpen, setSlotsOpen] = useState(false)

  const sc = { spells: [], slots: {}, ...character.spellcasting }
  const ability =
    sc.ability || character.classes?.find((c) => c.spellcastingAbility)?.spellcastingAbility || null

  // Group spells by level.
  const byLevel = {}
  for (const spell of sc.spells || []) {
    ;(byLevel[spell.level] ||= []).push(spell)
  }
  const levels = [...new Set([...Object.keys(byLevel).map(Number), ...Object.keys(sc.slots).map(Number)])].sort(
    (a, b) => a - b
  )

  const empty = !sc.spells?.length && Object.keys(sc.slots || {}).length === 0

  return (
    <>
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 10 }}>
        <button className="btn btn--sm" onClick={() => setSlotsOpen(true)}>
          ⚙ Edit spell slots
        </button>
      </div>

      {empty && (
        <div className="card">
          <div className="card__title">Spells</div>
          <p className="muted" style={{ padding: '4px 14px 14px' }}>
            No spells or slots yet. Add spells from the 🔍 compendium, set a spellcasting ability in
            your character details, or tap <b>Edit spell slots</b> above.
          </p>
        </div>
      )}

      {ability && (
        <div className="card">
          <div className="card__title">Spellcasting</div>
          <div className="row" style={{ padding: '6px 14px 14px', gap: 18 }}>
            <KeyStat label="Ability" value={ABILITY_NAMES[ability].slice(0, 3)} />
            <KeyStat label="Save DC" value={getSpellSaveDC(character, ability)} />
            <KeyStat label="Atk Bonus" value={signed(getSpellAttackBonus(character, ability))} />
          </div>
        </div>
      )}

      {levels.map((lvl) => {
        const slot = sc.slots[String(lvl)]
        const spells = (byLevel[lvl] || []).slice().sort((a, b) => a.name.localeCompare(b.name))
        return (
          <div className="card" key={lvl}>
            <div className="card__title">
              {LEVEL_LABEL(lvl)}
              {slot && (
                <SlotDots
                  max={slot.max}
                  used={slot.used}
                  onChange={(used) => setSlotUsed(String(lvl), used)}
                />
              )}
            </div>
            {spells.length === 0 ? (
              <p className="muted tiny" style={{ padding: '2px 14px 12px' }}>
                No spells known at this level.
              </p>
            ) : (
              spells.map((spell) => (
                <SpellRow
                  key={spell.id}
                  spell={spell}
                  slot={slot}
                  onCast={() => slot && setSlotUsed(String(lvl), slot.used + 1)}
                />
              ))
            )}
          </div>
        )
      })}

      {slotsOpen && <SlotEditor onClose={() => setSlotsOpen(false)} />}
    </>
  )
}

function SlotEditor({ onClose }) {
  const character = useStore((s) => s.character)
  const setSlotMax = useStore((s) => s.setSlotMax)
  const setAllSlots = useStore((s) => s.setAllSlots)
  const slots = character.spellcasting?.slots || {}
  const level = totalLevel(character)

  const autofill = () => {
    const arr = fullCasterSlots(level)
    const next = {}
    arr.forEach((count, idx) => {
      if (count > 0) {
        const lvl = String(idx + 1)
        next[lvl] = { max: count, used: Math.min(slots[lvl]?.used || 0, count) }
      }
    })
    setAllSlots(next)
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet sheet--center" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <h3>Spell Slots</h3>
          <button className="btn btn--sm btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="sheet__body">
          <p className="faint tiny" style={{ marginTop: 0 }}>
            Set how many slots you have at each level. Used slots reset on a long rest.
          </p>
          <div className="slot-grid">
            {Array.from({ length: 9 }).map((_, i) => {
              const lvl = String(i + 1)
              const max = slots[lvl]?.max || 0
              return (
                <label className="slot-row" key={lvl}>
                  <span>Level {i + 1}</span>
                  <input
                    inputMode="numeric"
                    value={max}
                    onChange={(e) => setSlotMax(lvl, e.target.value.replace(/[^0-9]/g, ''))}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
              )
            })}
          </div>
          <button className="btn btn--block" style={{ marginTop: 14 }} onClick={autofill}>
            Auto-fill: full caster (level {level})
          </button>
          <p className="faint tiny">
            Fills the standard full-caster table (Bard, Cleric, Druid, Sorcerer, Wizard). Half-casters
            (Paladin/Ranger) and Warlock pact magic differ — tweak the numbers above to match.
          </p>
        </div>
      </div>
    </div>
  )
}

function KeyStat({ label, value }) {
  return (
    <div className="center">
      <div className="statpill__label">{label}</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24 }}>{value}</div>
    </div>
  )
}

function SlotDots({ max, used, onChange }) {
  return (
    <div className="slotdots">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          className={`slotdot ${i < used ? 'is-used' : ''}`}
          aria-label={`Spell slot ${i + 1}`}
          onClick={() => onChange(i < used ? i : i + 1)}
        />
      ))}
    </div>
  )
}

function SpellRow({ spell, slot, onCast }) {
  const removeSpell = useStore((s) => s.removeSpell)
  const paragraphs = toParagraphs(spell.description)
  const canCast = slot && spell.level > 0
  return (
    <div className="listitem">
      <div className="listitem__head">
        <b>{spell.name}</b>
        {spell.concentration && <span className="badge">Conc.</span>}
        {spell.ritual && <span className="badge">Ritual</span>}
        {spell.prepared === false && <span className="badge">Unprepared</span>}
        {canCast && (
          <button
            className="btn btn--sm"
            disabled={slot.used >= slot.max}
            onClick={onCast}
          >
            Cast
          </button>
        )}
        <button
          className="iconbtn"
          aria-label={`Remove ${spell.name}`}
          title="Remove spell"
          onClick={() => removeSpell(spell.id)}
        >
          ✕
        </button>
      </div>
      <div className="spell-meta">
        {spell.school && <span>{spell.school}</span>}
        <span><b>Cast:</b> {spell.castingTime}</span>
        <span><b>Range:</b> {spell.range}</span>
        <span><b>Dur:</b> {spell.duration}</span>
        {spell.components && <span><b>Comp:</b> {spell.components}</span>}
      </div>
      {paragraphs.length > 0 && (
        <details className="collapser">
          <summary>Description</summary>
          <div className="desc">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {spell.materials && <p className="faint tiny">Materials: {spell.materials}</p>}
          </div>
        </details>
      )}
    </div>
  )
}
