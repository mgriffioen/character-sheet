import { useStore } from '../store/characterStore.js'
import { classLine, totalLevel } from '../model/character.js'
import {
  getAC,
  getMaxHp,
  getInitiative,
  getSpeed,
  getProficiencyBonus,
  getPassivePerception,
} from '../rules/derive.js'
import { signed } from '../rules/dnd.js'

export default function Header({ onMenu, onLookup }) {
  const character = useStore((s) => s.character)
  const rollCheck = useStore((s) => s.rollCheck)
  const setActiveTab = useStore((s) => s.setActiveTab)

  const maxHp = getMaxHp(character)
  const curHp = character.hp?.current ?? maxHp
  const temp = character.hp?.temp || 0
  const bloodied = maxHp > 0 && curHp <= maxHp / 2
  const subtitle = [character.race, classLine(character)].filter(Boolean).join(' • ')

  const initiative = getInitiative(character)

  return (
    <header className="header">
      <div className="header__top">
        {character.avatarUrl ? (
          <img className="header__avatar" src={character.avatarUrl} alt="" />
        ) : (
          <div className="header__avatar" aria-hidden />
        )}
        <div className="header__id">
          <div className="header__name">{character.name}</div>
          <div className="header__sub">
            {subtitle || `Level ${totalLevel(character)}`}
          </div>
        </div>
        <button
          className="header__menu-btn"
          onClick={onLookup}
          aria-label="Open compendium"
          title="Look up spells, items & rules"
        >
          🔍
        </button>
        <button className="header__menu-btn" onClick={onMenu} aria-label="Menu">
          ☰
        </button>
      </div>

      <div className="header__stats">
        <Pill label="AC" value={getAC(character)} />
        <button
          className={`statpill statpill--btn hp-pill ${bloodied ? 'is-bloodied' : ''}`}
          onClick={() => setActiveTab('combat')}
        >
          <div className="statpill__label">HP</div>
          <div className="statpill__value">
            {curHp}
            {temp > 0 && <small>+{temp}</small>}
            <small> / {maxHp}</small>
          </div>
        </button>
        <button
          className="statpill statpill--btn"
          onClick={() =>
            rollCheck({ label: 'Initiative', modifier: initiative, type: 'initiative' })
          }
        >
          <div className="statpill__label">Init</div>
          <div className="statpill__value">{signed(initiative)}</div>
        </button>
        <Pill label="Speed" value={getSpeed(character)} unit="ft" />
        <Pill label="Prof" value={signed(getProficiencyBonus(character))} />
        <Pill label="Pass.Per" value={getPassivePerception(character)} />
      </div>
    </header>
  )
}

function Pill({ label, value, unit }) {
  return (
    <div className="statpill">
      <div className="statpill__label">{label}</div>
      <div className="statpill__value">
        {value}
        {unit && <small> {unit}</small>}
      </div>
    </div>
  )
}
