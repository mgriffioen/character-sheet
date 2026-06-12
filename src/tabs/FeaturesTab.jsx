import { useState } from 'react'
import { useStore } from '../store/characterStore.js'
import { cryptoId } from '../model/character.js'
import { toParagraphs } from '../utils/text.js'

export default function FeaturesTab() {
  const character = useStore((s) => s.character)
  const features = character.features || []
  const [editing, setEditing] = useState(null) // feature object, or 'new', or null

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
      <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 10 }}>
        <button className="btn btn--sm" onClick={() => setEditing('new')}>
          + Add feature
        </button>
      </div>

      {features.length === 0 && (
        <div className="card">
          <div className="card__title">Features &amp; Traits</div>
          <p className="muted" style={{ padding: '4px 14px 14px' }}>
            No features yet. Tap <b>+ Add feature</b>, or browse Feats and Class Features in the 🔍
            compendium and add them to your sheet.
          </p>
        </div>
      )}

      {groups.map((group) => (
        <div className="card" key={group.source}>
          <div className="card__title">{group.source}</div>
          {group.items.map((f) => {
            const paragraphs = toParagraphs(f.description)
            return (
              <div className="listitem" key={f.id}>
                <div className="listitem__head">
                  <button className="attack__name attack__name--edit" onClick={() => setEditing(f)}>
                    <b>
                      {f.name} <span className="edit-glyph">✎</span>
                    </b>
                  </button>
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

      {editing && (
        <FeatureEditor feature={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </>
  )
}

function FeatureEditor({ feature, onClose }) {
  const upsertFeature = useStore((s) => s.upsertFeature)
  const removeFeature = useStore((s) => s.removeFeature)
  const isNew = !feature

  const [name, setName] = useState(feature?.name || '')
  const [source, setSource] = useState(feature?.source || 'Feat')
  const [description, setDescription] = useState(feature?.description || '')

  const save = () => {
    upsertFeature({
      id: feature?.id || cryptoId(),
      name: name.trim() || 'Feature',
      source: source.trim() || 'Other',
      level: feature?.level ?? null,
      description,
    })
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet sheet--center" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <h3>{isNew ? 'Add feature' : 'Edit feature'}</h3>
          <button className="btn btn--sm btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="sheet__body">
          <div className="field">
            <label>Name</label>
            <input value={name} autoFocus onChange={(e) => setName(e.target.value)} placeholder="e.g. Sharpshooter" />
          </div>
          <div className="field">
            <label>Source / group</label>
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Feat, Fighter, Elf" />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ minHeight: 120, resize: 'vertical' }}
              placeholder="What this feature does…"
            />
          </div>
          <button className="btn btn--primary btn--block" onClick={save}>
            {isNew ? 'Add feature' : 'Save'}
          </button>
          {!isNew && (
            <button
              className="btn btn--ghost btn--block btn--danger"
              style={{ marginTop: 8 }}
              onClick={() => {
                removeFeature(feature.id)
                onClose()
              }}
            >
              Delete feature
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
