import { useStore } from '../store/characterStore.js'
import {
  ABILITIES,
  ABILITY_NAMES,
  SKILLS,
  abilityModifier,
  signed,
} from '../rules/dnd.js'
import { getSaves, getSkills } from '../rules/derive.js'

// Cycle a skill proficiency: none → proficient → expertise → none.
const SKILL_CYCLE = { 0: 1, 1: 2, 2: 0, 0.5: 1 }

export default function SkillsTab() {
  const character = useStore((s) => s.character)
  const rollCheck = useStore((s) => s.rollCheck)
  const updateCharacter = useStore((s) => s.updateCharacter)

  const saves = getSaves(character)
  const skills = getSkills(character)

  const setAbility = (ability, raw) => {
    const value = raw === '' ? '' : Math.max(1, Math.min(40, parseInt(raw, 10) || 0))
    updateCharacter((c) => ({ ...c, abilities: { ...c.abilities, [ability]: value } }))
  }

  const toggleSave = (ability) =>
    updateCharacter((c) => ({
      ...c,
      saveProficiencies: { ...c.saveProficiencies, [ability]: !c.saveProficiencies[ability] },
    }))

  const cycleSkill = (key) =>
    updateCharacter((c) => {
      const cur = c.skillProficiencies[key] || 0
      return { ...c, skillProficiencies: { ...c.skillProficiencies, [key]: SKILL_CYCLE[cur] ?? 1 } }
    })

  return (
    <>
      {/* Ability scores */}
      <div className="abilities">
        {ABILITIES.map((a) => {
          const mod = abilityModifier(character.abilities[a])
          return (
            <div className="ability" key={a}>
              <div className="ability__name">{ABILITY_NAMES[a].slice(0, 3)}</div>
              <button
                className="ability__mod"
                onClick={() =>
                  rollCheck({ label: `${ABILITY_NAMES[a]} check`, modifier: mod, type: 'ability' })
                }
              >
                {signed(mod)}
              </button>
              <div>
                <input
                  className="ability__score"
                  inputMode="numeric"
                  value={character.abilities[a]}
                  onChange={(e) => setAbility(a, e.target.value)}
                  onFocus={(e) => e.target.select()}
                  aria-label={`${ABILITY_NAMES[a]} score`}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Saving throws */}
      <div className="card">
        <div className="card__title">
          Saving Throws <span className="section-hint">tap dot to set proficiency</span>
        </div>
        {ABILITIES.map((a) => {
          const save = saves[a]
          return (
            <button
              key={a}
              className="rollrow"
              onClick={() =>
                rollCheck({
                  label: `${ABILITY_NAMES[a]} save`,
                  modifier: save.total,
                  type: 'save',
                })
              }
            >
              <span
                className={`prof-dot ${save.proficient ? 'is-prof' : ''}`}
                role="checkbox"
                aria-checked={save.proficient}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleSave(a)
                }}
              />
              <span className="rollrow__name">
                <b>{ABILITY_NAMES[a]}</b>
              </span>
              <span className="rollrow__mod">{signed(save.total)}</span>
            </button>
          )
        })}
      </div>

      {/* Skills */}
      <div className="card">
        <div className="card__title">
          Skills <span className="section-hint">tap dot: prof → expertise → none</span>
        </div>
        {SKILLS.map((s) => {
          const skill = skills[s.key]
          const profClass =
            skill.profLevel === 2
              ? 'is-expert'
              : skill.profLevel === 0.5
              ? 'is-half'
              : skill.profLevel >= 1
              ? 'is-prof'
              : ''
          return (
            <button
              key={s.key}
              className="rollrow"
              onClick={() =>
                rollCheck({
                  label: `${s.name} (${s.ability.toUpperCase()})`,
                  modifier: skill.total,
                  type: 'skill',
                })
              }
            >
              <span
                className={`prof-dot ${profClass}`}
                onClick={(e) => {
                  e.stopPropagation()
                  cycleSkill(s.key)
                }}
              />
              <span className="rollrow__name">
                <b>{s.name}</b>
                <span className="rollrow__ability">{s.ability}</span>
              </span>
              <span className="rollrow__mod">{signed(skill.total)}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
