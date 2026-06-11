import { useState } from 'react'
import { useStore } from './store/characterStore.js'

import Welcome from './components/Welcome.jsx'
import Header from './components/Header.jsx'
import Tabs from './components/Tabs.jsx'
import DiceTray from './components/DiceTray.jsx'
import CharacterMenu from './components/CharacterMenu.jsx'
import LookupSheet from './components/LookupSheet.jsx'

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
      <Header onMenu={() => setMenuOpen(true)} onLookup={() => setLookupOpen(true)} />
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <div className="app__scroll" key={activeTab}>
        <Active />
      </div>
      <DiceTray />
      {menuOpen && <CharacterMenu onClose={() => setMenuOpen(false)} />}
      {lookupOpen && <LookupSheet onClose={() => setLookupOpen(false)} />}
    </div>
  )
}
