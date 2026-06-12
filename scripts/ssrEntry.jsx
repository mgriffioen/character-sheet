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
  // jsdom has no matchMedia; report reduced motion so the dice tumble animation
  // (timer-driven) stays inert during the test.
  dom.window.matchMedia = () => ({
    matches: true,
    media: '',
    addEventListener() {},
    removeEventListener() {},
  })

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
  assert(container.querySelector('svg.die'), 'shaped die did not render in the tray')
  console.log('  ✓ rolling     works (logged a d20, shaped die shown)')

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

  // Compendium: stub the SRD API, open it, find a spell, and add it.
  const tick = () => act(async () => new Promise((r) => setTimeout(r, 0)))
  globalThis.fetch = async (url) => {
    const u = String(url)
    const json = u.endsWith('/api/spells')
      ? { count: 1, results: [{ index: 'fireball', name: 'Fireball', url: '/api/spells/fireball' }] }
      : u.endsWith('/api/spells/fireball')
      ? {
          index: 'fireball',
          name: 'Fireball',
          level: 3,
          desc: ['A bright streak flashes from your finger.'],
          school: { name: 'Evocation' },
          casting_time: '1 action',
          range: '150 feet',
          duration: 'Instantaneous',
          components: ['V', 'S', 'M'],
          concentration: false,
          ritual: false,
        }
      : { count: 0, results: [] }
    return { ok: true, status: 200, json: async () => json }
  }

  await act(async () => container.querySelector('[aria-label="Open compendium"]').click())
  await tick()
  assert(container.textContent.includes('Fireball'), 'compendium spell list did not render')

  const row = [...container.querySelectorAll('.lookup__row')].find((b) => b.textContent.includes('Fireball'))
  await act(async () => row.click())
  await tick()
  assert(container.textContent.includes('Evocation'), 'compendium detail did not render')

  const addBtn = [...container.querySelectorAll('button')].find((b) => b.textContent.includes('Add to my spells'))
  await act(async () => addBtn.click())
  assert(
    useStore.getState().character.spellcasting.spells.some((s) => s.name === 'Fireball'),
    'spell was not added from the compendium'
  )
  // Close the compendium overlay.
  await act(async () =>
    [...container.querySelectorAll('.fsheet button')].find((b) => b.textContent.trim() === 'Close').click()
  )
  console.log('  ✓ compendium  search + add works')

  // Character editor: open it and confirm a level change updates derived stats.
  const { getProficiencyBonus } = await import('../src/rules/derive.js')
  assert(getProficiencyBonus(useStore.getState().character) === 3, 'sanity: bard 5 should be +3')
  await act(async () => container.querySelector('[aria-label="Edit character details"]').click())
  assert(container.textContent.includes('Character Details'), 'character editor did not open')
  assert(container.textContent.includes('Bard'), 'editor did not show the current class')

  const lvlInput = container.querySelector('.class-edit input[inputmode="numeric"]')
  const nativeSetter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set
  await act(async () => {
    nativeSetter.call(lvlInput, '9')
    lvlInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  })
  assert(
    getProficiencyBonus(useStore.getState().character) === 4,
    'editing class level to 9 should raise proficiency bonus to +4'
  )
  console.log('  ✓ editor      class/level edit updates derived stats')

  // Theme: changing the palette + accent applies to the document root.
  await act(async () => useStore.getState().setTheme('arcane'))
  assert(dom.window.document.documentElement.dataset.theme === 'arcane', 'theme not applied to root')
  await act(async () => useStore.getState().setAccent('#ff0000'))
  assert(
    dom.window.document.documentElement.style.getPropertyValue('--accent') === '#ff0000',
    'custom accent not applied to root'
  )
  await act(async () => useStore.getState().setAccent(null))
  assert(
    dom.window.document.documentElement.style.getPropertyValue('--accent') === '',
    'accent not cleared'
  )
  console.log('  ✓ theme       palette + accent apply to root')

  // Spell slots: the editor entry is present and max edits apply.
  await act(async () => useStore.getState().setActiveTab('spells'))
  assert(container.textContent.includes('Edit spell slots'), 'slot editor button missing')
  await act(async () => useStore.getState().setSlotMax('1', 5))
  assert(useStore.getState().character.spellcasting.slots['1'].max === 5, 'setSlotMax did not apply')
  await act(async () => useStore.getState().setSlotMax('1', 0))
  assert(!useStore.getState().character.spellcasting.slots['1'], 'setting max 0 did not remove the level')
  console.log('  ✓ slots       editable maximums work')

  await act(async () => root.unmount())
  dom.window.close()
  console.log('Render smoke test passed.')
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}
