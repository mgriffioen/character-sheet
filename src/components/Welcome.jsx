import { useState, useRef } from 'react'
import { useStore } from '../store/characterStore.js'
import { parseDdbCharacter } from '../ddb/parseDdb.js'
import { sampleDdbCharacter } from '../ddb/sampleDdbCharacter.js'
import CharacterBuilder from './CharacterBuilder.jsx'

export default function Welcome() {
  const setCharacter = useStore((s) => s.setCharacter)
  const newBlankCharacter = useStore((s) => s.newBlankCharacter)
  const [showImport, setShowImport] = useState(false)
  const [showBuilder, setShowBuilder] = useState(false)
  const [json, setJson] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const doImport = (text) => {
    setError('')
    let data
    try {
      data = JSON.parse(text)
    } catch {
      setError('That is not valid JSON. Copy the entire export, including the outer { } braces.')
      return
    }
    try {
      const character = parseDdbCharacter(data)
      setCharacter(character)
    } catch (e) {
      setError(e.message || 'Could not read this character.')
    }
  }

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => doImport(String(reader.result))
    reader.readAsText(file)
  }

  const loadSample = () => setCharacter(parseDdbCharacter(sampleDdbCharacter))

  if (showBuilder) {
    return <CharacterBuilder onClose={() => setShowBuilder(false)} />
  }

  if (!showImport) {
    return (
      <div className="welcome">
        <h1>⚔️ Character Sheet</h1>
        <p>
          An interactive D&amp;D 5e character sheet for the table. Roll any stat with a tap,
          track HP and spell slots, and build or import your hero.
        </p>
        <button className="btn btn--primary" onClick={() => setShowBuilder(true)}>
          🧭 Build a character (guided)
        </button>
        <button className="btn" onClick={() => setShowImport(true)}>
          Import from D&amp;D Beyond
        </button>
        <button className="btn" onClick={loadSample}>
          Try a sample character
        </button>
        <button className="btn btn--ghost" onClick={newBlankCharacter}>
          Start a blank sheet
        </button>
      </div>
    )
  }

  return (
    <div className="app__scroll" style={{ paddingBottom: 24 }}>
      <div className="stack" style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="row">
          <button className="btn btn--sm btn--ghost" onClick={() => setShowImport(false)}>
            ← Back
          </button>
          <h2 style={{ marginLeft: 4 }}>Import from D&amp;D Beyond</h2>
        </div>

        <div className="callout">
          <strong>How to get your character JSON:</strong>
          <ol style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            <li>
              On D&amp;D Beyond, open your character → the <b>gear / “Manage”</b> menu →
              set <b>Character Privacy</b> to <b>Public</b>. (Without this, the link
              below returns “403 Forbidden”.)
            </li>
            <li>
              Find your character ID — the number in your sheet's URL:<br />
              <code>dndbeyond.com/characters/<b>12345678</b></code>
            </li>
            <li>
              Open this URL in your browser:<br />
              <code>character-service.dndbeyond.com/character/v5/character/12345678</code>
            </li>
            <li>Select all of the page text, copy it, and paste it below.</li>
          </ol>
        </div>

        <div className="import-area">
          <textarea
            placeholder="Paste your D&D Beyond character JSON here…"
            value={json}
            onChange={(e) => {
              setJson(e.target.value)
              setError('')
            }}
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="row row--wrap">
          <button
            className="btn btn--primary"
            disabled={!json.trim()}
            onClick={() => doImport(json)}
          >
            Import character
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Upload .json file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json,.txt"
            style={{ display: 'none' }}
            onChange={onFile}
          />
          <button className="btn btn--ghost" onClick={loadSample}>
            Use sample instead
          </button>
        </div>

        <p className="faint tiny">
          Tip: your character data stays on this device (saved in your browser). Nothing is
          uploaded anywhere.
        </p>
      </div>
    </div>
  )
}
