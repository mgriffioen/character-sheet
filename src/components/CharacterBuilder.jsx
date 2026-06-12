import { useState, useEffect } from 'react'
import { useStore } from '../store/characterStore.js'
import { srdList, srdDetail } from '../srd/api.js'
import { buildCharacter, classSkillChoice } from '../srd/buildCharacter.js'
import { ABILITIES, ABILITY_NAMES, abilityModifier, signed } from '../rules/dnd.js'
import { getMaxHp, getSaves, getSkills } from '../rules/derive.js'

const STEPS = ['Basics', 'Race', 'Class', 'Abilities', 'Background', 'Review']
const STANDARD_ARRAY = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }

export default function CharacterBuilder({ onClose }) {
  const setCharacter = useStore((s) => s.setCharacter)

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [baseAbilities, setBaseAbilities] = useState({ ...STANDARD_ARRAY })
  const [race, setRace] = useState(null)
  const [klass, setKlass] = useState(null)
  const [chosenSkills, setChosenSkills] = useState([])
  const [background, setBackground] = useState(null)

  const skillChoice = klass ? classSkillChoice(klass) : null
  const preview = buildCharacter({ name, baseAbilities, race, klass, chosenSkillKeys: chosenSkills, background })

  const canNext = [true, !!race, !!klass, true, true, true][step]

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : finish())
  const back = () => (step > 0 ? setStep(step - 1) : onClose())
  const finish = () => {
    setCharacter(preview)
    onClose()
  }

  const racialBonus = (ability) =>
    (race?.ability_bonuses || [])
      .filter((b) => b.ability_score?.index === ability)
      .reduce((s, b) => s + (b.bonus || 0), 0)

  const toggleSkill = (key) => {
    setChosenSkills((cur) => {
      if (cur.includes(key)) return cur.filter((k) => k !== key)
      if (skillChoice && cur.length >= skillChoice.choose) return cur // at the limit
      return [...cur, key]
    })
  }

  return (
    <div className="fsheet">
      <div className="fsheet__head">
        <h3>Build a Character</h3>
        <span className="faint tiny">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </span>
        <span className="spacer" />
        <button className="btn btn--sm btn--ghost" onClick={onClose}>
          Cancel
        </button>
      </div>

      <div className="build-progress">
        {STEPS.map((s, i) => (
          <span key={s} className={`build-dot ${i <= step ? 'is-done' : ''}`} />
        ))}
      </div>

      <div className="fsheet__body">
        {step === 0 && (
          <div className="edit-section">
            <h4>Basics</h4>
            <div className="field">
              <label>Character name</label>
              <input value={name} autoFocus onChange={(e) => setName(e.target.value)} placeholder="Your hero's name" />
            </div>
            <p className="muted tiny">
              This wizard builds a level&nbsp;1 character from the free SRD. Everything is editable
              afterward, and you can level up later from the menu.
            </p>
          </div>
        )}

        {step === 1 && (
          <Picker
            path="races"
            selected={race}
            onPick={(d) => setRace(d)}
            renderMeta={(d) => raceSummary(d)}
          />
        )}

        {step === 2 && (
          <>
            <Picker
              path="classes"
              selected={klass}
              onPick={(d) => {
                setKlass(d)
                setChosenSkills([])
              }}
              renderMeta={(d) => classSummary(d)}
            />
            {klass && skillChoice && (
              <div className="edit-section" style={{ marginTop: 12 }}>
                <h4>
                  Skills
                  <span className="faint tiny" style={{ textTransform: 'none', letterSpacing: 0 }}>
                    Choose {skillChoice.choose} ({chosenSkills.length} picked)
                  </span>
                </h4>
                <div className="chips-edit">
                  {skillChoice.options.map((o) => (
                    <button
                      key={o.key}
                      className={`chip ${chosenSkills.includes(o.key) ? 'is-active' : ''}`}
                      onClick={() => toggleSkill(o.key)}
                    >
                      {o.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <div className="edit-section">
            <h4>
              Ability Scores
              <button className="btn btn--sm" onClick={() => setBaseAbilities({ ...STANDARD_ARRAY })}>
                Standard array
              </button>
            </h4>
            <p className="muted tiny" style={{ marginTop: 0 }}>
              Enter your base scores (standard array is 15, 14, 13, 12, 10, 8). Racial bonuses are
              added automatically.
            </p>
            <div className="ability-build">
              {ABILITIES.map((a) => {
                const bonus = racialBonus(a)
                const total = (Number(baseAbilities[a]) || 0) + bonus
                return (
                  <div className="ability-build__row" key={a}>
                    <span className="ability-build__name">{ABILITY_NAMES[a]}</span>
                    <input
                      inputMode="numeric"
                      value={baseAbilities[a]}
                      onChange={(e) =>
                        setBaseAbilities({
                          ...baseAbilities,
                          [a]: Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 0)),
                        })
                      }
                      onFocus={(e) => e.target.select()}
                    />
                    {bonus > 0 && <span className="faint tiny">+{bonus} race</span>}
                    <span className="ability-build__total">
                      {total} <small>({signed(abilityModifier(total))})</small>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <Picker
            path="backgrounds"
            selected={background}
            onPick={(d) => setBackground(d)}
            renderMeta={(d) => backgroundSummary(d)}
            optional
          />
        )}

        {step === 5 && <Review character={preview} />}
      </div>

      <div className="build-nav">
        <button className="btn" onClick={back}>
          {step === 0 ? 'Cancel' : 'Back'}
        </button>
        <span className="spacer" />
        <button className="btn btn--primary" disabled={!canNext} onClick={next}>
          {step === STEPS.length - 1 ? 'Create character' : 'Next'}
        </button>
      </div>
    </div>
  )
}

function Picker({ path, selected, onPick, renderMeta, optional }) {
  const [list, setList] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    srdList(path)
      .then((r) => !cancelled && setList(r))
      .catch((e) => !cancelled && setError(e.message || 'Failed to load.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [path])

  const filtered = query ? list.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())) : list

  const pick = async (entry) => {
    setBusy(true)
    setError('')
    try {
      const detail = await srdDetail(entry.url)
      onPick(detail)
    } catch (e) {
      setError(e.message || 'Failed to load.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {selected && (
        <div className="callout" style={{ marginBottom: 10, borderLeftColor: 'var(--accent)' }}>
          <strong>{selected.name}</strong>
          {renderMeta && <div className="muted tiny" style={{ marginTop: 4 }}>{renderMeta(selected)}</div>}
        </div>
      )}
      <div className="lookup__search" style={{ padding: '0 0 10px' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${path}…`}
          aria-label={`Search ${path}`}
        />
      </div>
      {optional && <p className="faint tiny" style={{ marginTop: -4 }}>Optional — you can skip this.</p>}
      {loading ? (
        <p className="muted center" style={{ padding: 16 }}>Loading…</p>
      ) : error ? (
        <p className="error-text center" style={{ padding: 16 }}>{error}</p>
      ) : (
        filtered.map((r) => (
          <button
            key={r.index || r.url}
            className={`lookup__row ${selected?.name === r.name ? 'is-selected' : ''}`}
            disabled={busy}
            onClick={() => pick(r)}
          >
            {r.name}
            <span className="faint">{selected?.name === r.name ? '✓' : '›'}</span>
          </button>
        ))
      )}
    </div>
  )
}

function Review({ character }) {
  const saves = getSaves(character)
  const skills = getSkills(character)
  const profSkills = Object.values(skills)
    .filter((s) => s.profLevel > 0)
    .map((s) => s.name)
  const profSaves = ABILITIES.filter((a) => saves[a].proficient).map((a) => ABILITY_NAMES[a].slice(0, 3))

  return (
    <div className="edit-section">
      <h4>Review</h4>
      <p style={{ marginTop: 0 }}>
        <b style={{ fontSize: 20 }}>{character.name}</b>
        <br />
        <span className="muted">
          {character.race} {character.classes[0]?.name} 1
          {character.background ? ` • ${character.background}` : ''}
        </span>
      </p>
      <div className="review-grid">
        {ABILITIES.map((a) => (
          <div key={a} className="review-ability">
            <div className="statpill__label">{ABILITY_NAMES[a].slice(0, 3)}</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>
              {character.abilities[a]} <small className="muted">{signed(abilityModifier(character.abilities[a]))}</small>
            </div>
          </div>
        ))}
      </div>
      <ul className="review-list">
        <li><b>Hit Points:</b> {getMaxHp(character)}</li>
        <li><b>Speed:</b> {character.speed} ft</li>
        <li><b>Saving throws:</b> {profSaves.join(', ') || '—'}</li>
        <li><b>Skills:</b> {profSkills.join(', ') || '—'}</li>
        {character.spellcasting?.ability && (
          <li><b>Spellcasting:</b> {ABILITY_NAMES[character.spellcasting.ability]}</li>
        )}
      </ul>
      <p className="faint tiny">
        Tap <b>Create character</b> to start playing. You can fine-tune everything afterward, add
        spells from the compendium, and level up from the menu.
      </p>
    </div>
  )
}

// ---- summaries for the picker callout ----

function raceSummary(d) {
  const bonuses = (d.ability_bonuses || [])
    .map((b) => `+${b.bonus} ${(b.ability_score?.index || '').toUpperCase()}`)
    .join(', ')
  return `Speed ${d.speed} ft${bonuses ? ` • ${bonuses}` : ''}`
}

function classSummary(d) {
  const saves = (d.saving_throws || []).map((s) => s.index?.toUpperCase()).join(', ')
  return `d${d.hit_die} Hit Die${saves ? ` • Saves: ${saves}` : ''}`
}

function backgroundSummary(d) {
  return d.feature?.name ? `Feature: ${d.feature.name}` : ''
}
