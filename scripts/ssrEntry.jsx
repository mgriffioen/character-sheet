// Render smoke test. Mounts the real app into a jsdom document with
// react-dom/client (which uses the live store snapshot, like a browser), loads
// the sample character, switches through every tab, and asserts key content
// renders without throwing. Bundled by scripts/smoke.mjs via esbuild.
import { JSDOM } from 'jsdom'

export async function run() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/',
  })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.localStorage = dom.window.localStorage
  globalThis.IS_REACT_ACT_ENVIRONMENT = true

  const React = (await import('react')).default
  const { act } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { useStore } = await import('../src/store/characterStore.js')
  const { parseDdbCharacter } = await import('../src/ddb/parseDdb.js')
  const { sampleDdbCharacter } = await import('../src/ddb/sampleDdbCharacter.js')
  const App = (await import('../src/App.jsx')).default

  const container = dom.window.document.getElementById('root')
  let root
  await act(async () => {
    root = createRoot(container)
    root.render(React.createElement(App))
  })

  // Welcome screen first (no character yet).
  assert(container.textContent.includes('Character Sheet'), 'welcome title missing')
  console.log('  ✓ welcome     rendered')

  // Load the sample character and walk every tab.
  await act(async () => {
    useStore.getState().setCharacter(parseDdbCharacter(sampleDdbCharacter))
  })

  const checks = {
    skills: ['Lyra Quickwit', 'Persuasion', '+10', 'Saving Throws'],
    combat: ['Hit Points', 'Rapier', 'CRIT'],
    spells: ['Spellcasting', 'Vicious Mockery', 'Shatter', 'Save DC'],
    inventory: ['Currency', 'Studded Leather', 'GP'],
    features: ['Bardic Inspiration', 'Font of Inspiration'],
  }

  for (const [tab, needles] of Object.entries(checks)) {
    await act(async () => {
      useStore.getState().setActiveTab(tab)
    })
    const text = container.textContent
    for (const needle of needles) {
      assert(text.includes(needle), `${tab}: expected to find "${needle}"`)
    }
    console.log(`  ✓ ${tab.padEnd(10)} rendered`)
  }

  // Exercise a couple of interactions: roll a skill, take damage.
  await act(async () => {
    useStore.getState().setActiveTab('skills')
    useStore.getState().rollCheck({ label: 'Stealth (DEX)', modifier: 2, type: 'skill' })
  })
  assert(useStore.getState().rollLog.length > 0, 'roll log did not record a roll')
  const last = useStore.getState().rollLog[0]
  assert(last.total >= 3 && last.total <= 22, 'd20 roll out of expected range')
  console.log('  ✓ rolling     works (logged a d20)')

  await act(async () => {
    useStore.getState().adjustHp(-10)
  })
  assert(useStore.getState().character.hp.current === 28, 'HP damage did not apply (expected 38-10=28)')
  console.log('  ✓ hp damage   works')

  // Editable attacks: add a custom attack, confirm it renders, then remove it.
  await act(async () => {
    useStore.getState().setActiveTab('combat')
    useStore.getState().upsertAttack({
      id: 'test-atk',
      name: 'Test Blade',
      actionType: 'attack',
      range: '5 ft',
      toHitBonus: 7,
      damage: [{ count: 2, sides: 6, type: 'Slashing', bonus: 3 }],
      notes: '',
    })
  })
  assert(container.textContent.includes('Test Blade'), 'custom attack did not render')
  assert(container.textContent.includes('2d6+3'), 'custom attack damage did not render')
  await act(async () => useStore.getState().removeAttack('test-atk'))
  assert(!container.textContent.includes('Test Blade'), 'attack was not removed')
  console.log('  ✓ attacks     add/remove works')

  await act(async () => root.unmount())
  dom.window.close()
  console.log('Render smoke test passed.')
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}
