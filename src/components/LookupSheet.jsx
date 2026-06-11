import { useEffect, useState } from 'react'
import { useStore } from '../store/characterStore.js'
import { SRD_CATEGORIES, srdList, srdDetail } from '../srd/api.js'
import { srdSpellToModel, srdItemToModel } from '../srd/adapters.js'
import { toParagraphs } from '../utils/text.js'

export default function LookupSheet({ onClose }) {
  const [categoryKey, setCategoryKey] = useState('spells')
  const [query, setQuery] = useState('')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null) // a {index,name,url} list entry

  const category = SRD_CATEGORIES.find((c) => c.key === categoryKey)

  // Load the index for the active category (cached after first fetch).
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setSelected(null)
    srdList(category.path)
      .then((results) => {
        if (!cancelled) setList(results)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Failed to load.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [category.path])

  const filtered = query
    ? list.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
    : list

  return (
    <div className="fsheet">
      <div className="fsheet__head">
        <h3>Compendium</h3>
        <span className="faint tiny">SRD via dnd5eapi.co</span>
        <span className="spacer" />
        <button className="btn btn--sm btn--ghost" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="lookup__chips">
        {SRD_CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={`chip ${c.key === categoryKey ? 'is-active' : ''}`}
            onClick={() => {
              setCategoryKey(c.key)
              setQuery('')
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {!selected && (
        <div className="lookup__search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${category.label.toLowerCase()}…`}
            aria-label="Search compendium"
          />
        </div>
      )}

      <div className="fsheet__body">
        {selected ? (
          <Detail entry={selected} category={category} onBack={() => setSelected(null)} />
        ) : loading ? (
          <p className="muted center" style={{ padding: 24 }}>
            Loading {category.label.toLowerCase()}…
          </p>
        ) : error ? (
          <div className="center" style={{ padding: 24 }}>
            <p className="error-text">{error}</p>
            <button className="btn btn--sm" onClick={() => setCategoryKey(categoryKey)}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {filtered.length === 0 && <p className="muted center" style={{ padding: 24 }}>No matches.</p>}
            {filtered.slice(0, 200).map((r) => (
              <button key={r.index || r.url} className="lookup__row" onClick={() => setSelected(r)}>
                {r.name}
                <span className="faint">›</span>
              </button>
            ))}
            {filtered.length > 200 && (
              <p className="faint tiny center" style={{ padding: 12 }}>
                Showing first 200 — refine your search to narrow it down.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Detail({ entry, category, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(false)

  const character = useStore((s) => s.character)
  const addSpell = useStore((s) => s.addSpell)
  const addInventoryItem = useStore((s) => s.addInventoryItem)
  const setActiveTab = useStore((s) => s.setActiveTab)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setAdded(false)
    srdDetail(entry.url)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message || 'Failed to load.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [entry.url])

  const add = () => {
    if (category.addable === 'spell') {
      const ability =
        character?.spellcasting?.ability ||
        character?.classes?.find((c) => c.spellcastingAbility)?.spellcastingAbility ||
        null
      addSpell(srdSpellToModel(data, ability))
    } else if (category.addable === 'item') {
      addInventoryItem(srdItemToModel(data))
    }
    setAdded(true)
  }

  return (
    <div className="detail">
      <button className="btn btn--sm btn--ghost" onClick={onBack}>
        ‹ Back
      </button>

      {loading ? (
        <p className="muted center" style={{ padding: 24 }}>
          Loading…
        </p>
      ) : error ? (
        <p className="error-text center" style={{ padding: 24 }}>
          {error}
        </p>
      ) : data ? (
        <>
          <h2 style={{ marginTop: 10 }}>{data.name}</h2>
          <DetailMeta data={data} category={category} />
          <div className="desc" style={{ marginTop: 8 }}>
            {toParagraphs(descriptionOf(data)).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {category.addable && (
            <div style={{ marginTop: 16 }}>
              {added ? (
                <div className="row" style={{ gap: 10 }}>
                  <span className="badge badge--accent">Added ✓</span>
                  <button
                    className="btn btn--sm"
                    onClick={() => setActiveTab(category.addable === 'spell' ? 'spells' : 'inventory')}
                  >
                    View in {category.addable === 'spell' ? 'Spells' : 'Items'}
                  </button>
                </div>
              ) : (
                <button className="btn btn--primary btn--block" onClick={add}>
                  {category.addable === 'spell' ? '+ Add to my spells' : '+ Add to my inventory'}
                </button>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

function DetailMeta({ data, category }) {
  const bits = []
  if (category.key === 'spells') {
    bits.push(data.level === 0 ? 'Cantrip' : `Level ${data.level}`)
    if (data.school?.name) bits.push(data.school.name)
    if (data.casting_time) bits.push(data.casting_time)
    if (data.range) bits.push(data.range)
    if (data.duration) bits.push(data.duration)
    if (Array.isArray(data.components)) bits.push(data.components.join(', '))
    if (data.concentration) bits.push('Concentration')
    if (data.ritual) bits.push('Ritual')
  } else if (category.key === 'equipment') {
    if (data.category_range || data.equipment_category?.name) bits.push(data.category_range || data.equipment_category.name)
    if (data.damage?.damage_dice) bits.push(`${data.damage.damage_dice} ${data.damage.damage_type?.name || ''}`.trim())
    if (data.cost) bits.push(`${data.cost.quantity} ${data.cost.unit}`)
    if (data.weight) bits.push(`${data.weight} lb`)
  } else if (category.key === 'magic-items') {
    if (data.equipment_category?.name) bits.push(data.equipment_category.name)
    if (data.rarity?.name) bits.push(data.rarity.name)
  }
  if (!bits.length) return null
  return (
    <div className="spell-meta" style={{ marginTop: 6 }}>
      {bits.map((b, i) => (
        <span key={i}>{b}</span>
      ))}
    </div>
  )
}

// Several SRD shapes use `desc` (array) or, for rules, a markdown string.
function descriptionOf(data) {
  if (Array.isArray(data.desc)) return data.desc.join('\n\n')
  return data.desc || ''
}
