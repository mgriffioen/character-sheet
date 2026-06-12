import { useState, useEffect } from 'react'
import { useStore } from './store/characterStore.js'

import Welcome from './components/Welcome.jsx'
import Header from './components/Header.jsx'
import Tabs from './components/Tabs.jsx'
import DiceTray from './components/DiceTray.jsx'
import CharacterMenu from './components/CharacterMenu.jsx'
import LookupSheet from './components/LookupSheet.jsx'
import CharacterEditor from './components/CharacterEditor.jsx'
import LevelUpWizard from './components/LevelUpWizard.jsx'

import SkillsTab from './tabs/SkillsTab.jsx'
import CombatTab from './tabs/CombatTab.jsx'
import SpellsTab from './tabs/SpellsTab.jsx'
import InventoryTab from './tabs/InventoryTab.jsx'
import FeaturesTab from './tabs/FeaturesTab.jsx'

const TABS = [
  { key: 'skills', label: 'Skills', Component: SkillsTab },
  { key: 'combat', label: 'Combat', Component: CombatTab },
  { key: 'spells', label: 'Spells', Component: SpellsTab },
  { key: 'inventory', label: 'Items', Component: InventoryTab },
  { key: 'features', label: 'Features', Component: FeaturesTab },
]

export default function App() {
  const character = useStore((s) => s.character)
  const activeTab = useStore((s) => s.activeTab)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const [menuOpen, setMenuOpen] = useState(false)
  const [lookupOpen, setLookupOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [levelUpOpen, setLevelUpOpen] = useState(false)

  const theme = useStore((s) => s.theme)
  const accent = useStore((s) => s.accent)

  // Apply the chosen palette + optional custom accent to the document root,
  // and keep the mobile browser chrome color in sync with the background.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme || 'ember'
    if (accent) root.style.setProperty('--accent', accent)
    else root.style.removeProperty('--accent')
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      const bg = getComputedStyle(root).getPropertyValue('--bg').trim()
      if (bg) meta.setAttribute('content', bg)
    }
  }, [theme, accent])

  if (!character) {
    return (
      <div className="app">
        <Welcome />
      </div>
    )
  }

  const Active = (TABS.find((t) => t.key === activeTab) || TABS[0]).Component

  return (
    <div className="app">
      <Header
        onMenu={() => setMenuOpen(true)}
        onLookup={() => setLookupOpen(true)}
        onEdit={() => setEditorOpen(true)}
      />
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <div className="app__scroll" key={activeTab}>
        <Active />
      </div>
      <DiceTray />
      {menuOpen && (
        <CharacterMenu
          onClose={() => setMenuOpen(false)}
          onEditDetails={() => {
            setMenuOpen(false)
            setEditorOpen(true)
          }}
          onLevelUp={() => {
            setMenuOpen(false)
            setLevelUpOpen(true)
          }}
        />
      )}
      {lookupOpen && <LookupSheet onClose={() => setLookupOpen(false)} />}
      {editorOpen && <CharacterEditor onClose={() => setEditorOpen(false)} />}
      {levelUpOpen && <LevelUpWizard onClose={() => setLevelUpOpen(false)} />}
    </div>
  )
}
