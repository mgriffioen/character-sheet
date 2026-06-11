import { useStore } from '../store/characterStore.js'
import { toParagraphs } from '../utils/text.js'

const COINS = [
  { key: 'cp', label: 'CP' },
  { key: 'sp', label: 'SP' },
  { key: 'ep', label: 'EP' },
  { key: 'gp', label: 'GP' },
  { key: 'pp', label: 'PP' },
]

const RARITY_CLASS = {
  Common: '',
  Uncommon: 'badge--gold',
  Rare: 'badge--gold',
  'Very Rare': 'badge--accent',
  Legendary: 'badge--accent',
  Artifact: 'badge--accent',
}

export default function InventoryTab() {
  const character = useStore((s) => s.character)
  const updateCharacter = useStore((s) => s.updateCharacter)
  const removeInventoryItem = useStore((s) => s.removeInventoryItem)

  const setCoin = (key, raw) => {
    const value = raw === '' ? 0 : parseInt(raw, 10) || 0
    updateCharacter((c) => ({ ...c, currencies: { ...c.currencies, [key]: value } }))
  }

  const toggleEquip = (id) =>
    updateCharacter((c) => ({
      ...c,
      inventory: c.inventory.map((i) => (i.id === id ? { ...i, equipped: !i.equipped } : i)),
    }))

  const items = character.inventory || []
  const totalWeight = items.reduce((s, i) => s + (i.weight || 0) * (i.quantity || 1), 0)

  return (
    <>
      <div className="card">
        <div className="card__title">Currency</div>
        <div style={{ padding: '6px 12px 14px' }}>
          <div className="currency">
            {COINS.map((c) => (
              <div key={c.key}>
                <label>{c.label}</label>
                <input
                  inputMode="numeric"
                  value={character.currencies?.[c.key] ?? 0}
                  onChange={(e) => setCoin(c.key, e.target.value.replace(/[^0-9]/g, ''))}
                  onFocus={(e) => e.target.select()}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__title">
          Inventory
          <span className="section-hint">
            {items.length} items • {totalWeight.toFixed(totalWeight % 1 ? 1 : 0)} lb
          </span>
        </div>
        {items.length === 0 ? (
          <p className="muted" style={{ padding: '4px 14px 14px' }}>
            No items yet.
          </p>
        ) : (
          items.map((item) => {
            const paragraphs = toParagraphs(item.description)
            return (
              <div className="listitem" key={item.id}>
                <div className="listitem__head">
                  <b>
                    {item.name}
                    {item.quantity > 1 && <span className="faint"> ×{item.quantity}</span>}
                  </b>
                  {item.rarity && item.rarity !== 'Common' && (
                    <span className={`badge ${RARITY_CLASS[item.rarity] || ''}`}>{item.rarity}</span>
                  )}
                  {item.attuned && <span className="badge badge--gold">Attuned</span>}
                  <button
                    className={`badge ${item.equipped ? 'badge--accent' : ''}`}
                    onClick={() => toggleEquip(item.id)}
                  >
                    {item.equipped ? 'Equipped' : 'Equip'}
                  </button>
                  <button
                    className="iconbtn"
                    aria-label={`Remove ${item.name}`}
                    title="Remove item"
                    onClick={() => removeInventoryItem(item.id)}
                  >
                    ✕
                  </button>
                </div>
                {paragraphs.length > 0 && (
                  <details className="collapser">
                    <summary>Details</summary>
                    <div className="desc">
                      {paragraphs.slice(0, 6).map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
