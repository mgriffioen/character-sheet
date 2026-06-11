import { useStore } from '../store/characterStore.js'
import { toParagraphs } from '../utils/text.js'

export default function FeaturesTab() {
  const character = useStore((s) => s.character)
  const features = character.features || []

  if (features.length === 0) {
    return (
      <div className="card">
        <div className="card__title">Features &amp; Traits</div>
        <p className="muted" style={{ padding: '4px 14px 14px' }}>
          No features found. Class features, racial traits, and feats from a D&amp;D Beyond import
          appear here.
        </p>
      </div>
    )
  }

  // Group by source (class name / race / "Feat"), preserving first-seen order.
  const groups = []
  const index = new Map()
  for (const f of features) {
    const src = f.source || 'Other'
    if (!index.has(src)) {
      index.set(src, groups.length)
      groups.push({ source: src, items: [] })
    }
    groups[index.get(src)].items.push(f)
  }

  return (
    <>
      {groups.map((group) => (
        <div className="card" key={group.source}>
          <div className="card__title">{group.source}</div>
          {group.items.map((f) => {
            const paragraphs = toParagraphs(f.description)
            return (
              <div className="listitem" key={f.id}>
                <div className="listitem__head">
                  <b>{f.name}</b>
                  {f.level != null && <span className="badge">Lvl {f.level}</span>}
                </div>
                {paragraphs.length > 0 && (
                  <details className="collapser">
                    <summary>Details</summary>
                    <div className="desc">
                      {paragraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </>
  )
}
