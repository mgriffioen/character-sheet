import { useStore } from '../store/characterStore.js'
import { getSpellSaveDC, getSpellAttackBonus } from '../rules/derive.js'
import { ABILITY_NAMES, signed } from '../rules/dnd.js'
import { toParagraphs } from '../utils/text.js'

const LEVEL_LABEL = (lvl) => (lvl === 0 ? 'Cantrips' : `Level ${lvl}`)

export default function SpellsTab() {
  const character = useStore((s) => s.character)
  const setSlotUsed = useStore((s) => s.setSlotUsed)

  const sc = { spells: [], slots: {}, ...character.spellcasting }
  const ability =
    sc.ability || character.classes?.find((c) => c.spellcastingAbility)?.spellcastingAbility || null

  if (!sc.spells?.length && Object.keys(sc.slots || {}).length === 0) {
    return (
      <div className="card">
        <div className="card__title">Spells</div>
        <p className="muted" style={{ padding: '4px 14px 14px' }}>
          No spells found. Non-casters won't have any — or import a caster from D&amp;D Beyond.
        </p>
      </div>
    )
  }

  // Group spells by level.
  const byLevel = {}
  for (const spell of sc.spells || []) {
    ;(byLevel[spell.level] ||= []).push(spell)
  }
  const levels = [...new Set([...Object.keys(byLevel).map(Number), ...Object.keys(sc.slots).map(Number)])].sort(
    (a, b) => a - b
  )

  return (
    <>
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
    </>
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
