import { useState, useEffect } from 'react'
import { useStore } from '../store/characterStore.js'
import { srdDetail } from '../srd/api.js'
import {
  dieSides,
  hitDieAverage,
  isAsiLevel,
  slotsForLevel,
  featuresForLevel,
  levelUpCharacter,
} from '../srd/levelUp.js'
import { rollDie } from '../dice/dice.js'
import { ABILITIES, ABILITY_NAMES, abilityModifier, signed } from '../rules/dnd.js'

export default function LevelUpWizard({ onClose }) {
  const character = useStore((s) => s.character)
  const updateCharacter = useStore((s) => s.updateCharacter)

  // Which class gains the level (single-class flow picks the only/first one,
  // but a multiclass character can choose which existing class to advance).
  const classes = character.classes || []
  const [classIdx, setClassIdx] = useState(0)
  const klass = classes[classIdx] || { name: 'Class', level: 1, hitDie: 'd8' }
  const classIndex = (klass.name || '').toLowerCase()
  const newLevel = (klass.level || 1) + 1
  const conMod = abilityModifier(character.abilities?.con)

  const [levelsData, setLevelsData] = useState(null)
  const [subclasses, setSubclasses] = useState(null)
  const [loaded, setLoaded] = useState(false)

  const [stepIndex, setStepIndex] = useState(0)
  const [hpMethod, setHpMethod] = useState('average') // 'average' | 'roll'
  const [hpRoll, setHpRoll] = useState(null)
  const [asiMode, setAsiMode] = useState('two') // 'two' | 'one' | 'feat'
  const [asiOne, setAsiOne] = useState('con')
  const [asiA, setAsiA] = useState('str')
  const [asiB, setAsiB] = useState('dex')
  const [subclass, setSubclass] = useState('')

  // Fetch the class's per-level data + subclasses (best-effort; fallbacks exist).
  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    Promise.allSettled([
      srdDetail(`/api/classes/${classIndex}/levels`),
      srdDetail(`/api/classes/${classIndex}`),
    ]).then(([lv, det]) => {
      if (cancelled) return
      if (lv.status === 'fulfilled' && Array.isArray(lv.value)) setLevelsData(lv.value)
      if (det.status === 'fulfilled') setSubclasses(det.value?.subclasses || [])
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [classIndex])

  const sides = dieSides(klass.hitDie)
  const avgGain = hitDieAverage(klass.hitDie) + conMod
  const rollGain = hpRoll != null ? hpRoll + conMod : null
  const hpGain = Math.max(1, hpMethod === 'roll' && hpRoll != null ? rollGain : avgGain)

  const asi = isAsiLevel(newLevel, levelsData)
  const newSlots = slotsForLevel({
    classIndex,
    newLevel,
    levelsData,
    prevSlots: character.spellcasting?.slots || {},
  })
  const newFeatures = featuresForLevel({ levelsData, newLevel, className: klass.name })
  const needsSubclass = !klass.subclass && (subclasses?.length || 0) > 0

  // Build the step list dynamically.
  const steps = ['hp']
  if (asi) steps.push('asi')
  if (needsSubclass) steps.push('subclass')
  steps.push('gains')
  const step = steps[stepIndex]

  const abilityIncreases =
    !asi || asiMode === 'feat'
      ? {}
      : asiMode === 'one'
      ? { [asiOne]: 2 }
      : { [asiA]: 1, [asiB]: 1 }

  const finish = () => {
    updateCharacter((c) =>
      levelUpCharacter(c, {
        classArrayIndex: classIdx,
        hpGain,
        abilityIncreases,
        subclass: subclass || undefined,
        features: newFeatures,
        slots: newSlots || undefined,
      })
    )
    onClose()
  }

  const next = () => (stepIndex < steps.length - 1 ? setStepIndex(stepIndex + 1) : finish())
  const back = () => (stepIndex > 0 ? setStepIndex(stepIndex - 1) : onClose())

  return (
    <div className="fsheet">
      <div className="fsheet__head">
        <h3>Level Up</h3>
        <span className="faint tiny">
          {klass.name} {klass.level} → {newLevel}
        </span>
        <span className="spacer" />
        <button className="btn btn--sm btn--ghost" onClick={onClose}>
          Cancel
        </button>
      </div>

      <div className="fsheet__body">
        {classes.length > 1 && stepIndex === 0 && (
          <div className="edit-section">
            <h4>Which class?</h4>
            <div className="chips-edit">
              {classes.map((c, i) => (
                <button
                  key={i}
                  className={`chip ${i === classIdx ? 'is-active' : ''}`}
                  onClick={() => setClassIdx(i)}
                >
                  {c.name} {c.level} → {c.level + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'hp' && (
          <div className="edit-section">
            <h4>Hit Points</h4>
            <p className="muted tiny" style={{ marginTop: 0 }}>
              Gain HP for {klass.name} level {newLevel} ({klass.hitDie}, CON {signed(conMod)}).
            </p>
            <label className="lvl-option">
              <input type="radio" checked={hpMethod === 'average'} onChange={() => setHpMethod('average')} />
              <span>
                Take the average — <b>+{avgGain}</b> HP
              </span>
            </label>
            <label className="lvl-option">
              <input type="radio" checked={hpMethod === 'roll'} onChange={() => setHpMethod('roll')} />
              <span>
                Roll {klass.hitDie}
                {hpMethod === 'roll' && (
                  <>
                    {' '}
                    <button
                      className="btn btn--sm"
                      onClick={() => setHpRoll(rollDie(sides))}
                      style={{ marginLeft: 6 }}
                    >
                      {hpRoll == null ? 'Roll' : 'Re-roll'}
                    </button>
                    {hpRoll != null && (
                      <b style={{ marginLeft: 8 }}>
                        {hpRoll} {signed(conMod)} = +{rollGain} HP
                      </b>
                    )}
                  </>
                )}
              </span>
            </label>
            <p className="muted" style={{ marginTop: 10 }}>
              New maximum: <b>{(character.hp?.max || 0) + hpGain}</b>
            </p>
          </div>
        )}

        {step === 'asi' && (
          <div className="edit-section">
            <h4>Ability Score Improvement</h4>
            <label className="lvl-option">
              <input type="radio" checked={asiMode === 'two'} onChange={() => setAsiMode('two')} />
              <span>+1 to two abilities</span>
            </label>
            {asiMode === 'two' && (
              <div className="row" style={{ gap: 10, margin: '4px 0 8px 26px' }}>
                <AbilitySelect value={asiA} onChange={setAsiA} />
                <AbilitySelect value={asiB} onChange={setAsiB} />
              </div>
            )}
            <label className="lvl-option">
              <input type="radio" checked={asiMode === 'one'} onChange={() => setAsiMode('one')} />
              <span>+2 to one ability</span>
            </label>
            {asiMode === 'one' && (
              <div className="row" style={{ margin: '4px 0 8px 26px' }}>
                <AbilitySelect value={asiOne} onChange={setAsiOne} />
              </div>
            )}
            <label className="lvl-option">
              <input type="radio" checked={asiMode === 'feat'} onChange={() => setAsiMode('feat')} />
              <span>Take a feat instead (add it from Features later)</span>
            </label>
          </div>
        )}

        {step === 'subclass' && (
          <div className="edit-section">
            <h4>Subclass</h4>
            {!loaded ? (
              <p className="muted">Loading…</p>
            ) : (
              <>
                <div className="chips-edit">
                  {(subclasses || []).map((sc) => (
                    <button
                      key={sc.index || sc.name}
                      className={`chip ${subclass === sc.name ? 'is-active' : ''}`}
                      onClick={() => setSubclass(subclass === sc.name ? '' : sc.name)}
                    >
                      {sc.name}
                    </button>
                  ))}
                </div>
                <p className="faint tiny">Optional — pick now or set it later in character details.</p>
              </>
            )}
          </div>
        )}

        {step === 'gains' && (
          <div className="edit-section">
            <h4>What You Gain</h4>
            <ul className="review-list">
              <li>
                <b>+{hpGain} HP</b> (new max {(character.hp?.max || 0) + hpGain})
              </li>
              {asi && asiMode !== 'feat' && (
                <li>
                  <b>Ability scores:</b>{' '}
                  {Object.entries(abilityIncreases)
                    .map(([k, v]) => `+${v} ${ABILITY_NAMES[k].slice(0, 3)}`)
                    .join(', ')}
                </li>
              )}
              {subclass && <li><b>Subclass:</b> {subclass}</li>}
              {newFeatures.length > 0 && (
                <li><b>Features:</b> {newFeatures.map((f) => f.name).join(', ')}</li>
              )}
              {newSlots && <li><b>Spell slots updated</b> for level {newLevel}</li>}
            </ul>
            {!loaded && (
              <p className="faint tiny">
                (Couldn't reach the SRD, so feature names may be missing — HP, ASI and slots still
                apply. You can add features from the compendium.)
              </p>
            )}
            {newSlots && (
              <p className="faint tiny">
                Tip: add newly available spells from the 🔍 compendium after leveling.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="build-nav">
        <button className="btn" onClick={back}>
          {stepIndex === 0 ? 'Cancel' : 'Back'}
        </button>
        <span className="spacer" />
        <button className="btn btn--primary" onClick={next}>
          {stepIndex === steps.length - 1 ? `Level up to ${newLevel}` : 'Next'}
        </button>
      </div>
    </div>
  )
}

function AbilitySelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {ABILITIES.map((a) => (
        <option key={a} value={a}>
          {ABILITY_NAMES[a]}
        </option>
      ))}
    </select>
  )
}
