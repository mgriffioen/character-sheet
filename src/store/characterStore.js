import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { createBlankCharacter, cryptoId } from '../model/character.js'
import { rollD20, rollExpression, rollDamageParts } from '../dice/dice.js'

const MAX_LOG = 60

// The app's single source of truth: the active character, dice roll state, and
// a rolling log. Persisted to localStorage so a tablet keeps state across
// reloads. Roll log is persisted small so recent history survives a refresh.
export const useStore = create(
  persist(
    (set, get) => ({
      character: null, // null until imported/created — shows the welcome screen
      rollMode: 'normal', // 'normal' | 'advantage' | 'disadvantage'
      rollLog: [],
      activeTab: 'skills',

      // ---- character lifecycle ----
      setCharacter: (character) => set({ character, activeTab: 'skills' }),
      newBlankCharacter: () => set({ character: createBlankCharacter(), activeTab: 'skills' }),
      clearCharacter: () => set({ character: null }),

      // Generic functional update: updateCharacter(c => nextC).
      updateCharacter: (updater) =>
        set((state) => (state.character ? { character: updater(state.character) } : state)),

      setOverride: (key, value) =>
        set((state) => {
          if (!state.character) return state
          const overrides = { ...state.character.overrides }
          if (value === '' || value === null || value === undefined) delete overrides[key]
          else overrides[key] = value
          return { character: { ...state.character, overrides } }
        }),

      // ---- HP helpers ----
      adjustHp: (delta) =>
        set((state) => {
          if (!state.character) return state
          const hp = { ...state.character.hp }
          if (delta < 0) {
            // damage hits temp HP first
            let dmg = -delta
            const fromTemp = Math.min(hp.temp || 0, dmg)
            hp.temp = (hp.temp || 0) - fromTemp
            dmg -= fromTemp
            hp.current = Math.max(0, (hp.current || 0) - dmg)
          } else {
            const max = state.character.overrides?.hpMax ?? hp.max
            hp.current = Math.min(max, (hp.current || 0) + delta)
          }
          return { character: { ...state.character, hp } }
        }),

      setTempHp: (temp) =>
        set((state) =>
          state.character
            ? { character: { ...state.character, hp: { ...state.character.hp, temp: Math.max(0, Number(temp) || 0) } } }
            : state
        ),

      setDeathSaves: (deathSaves) =>
        set((state) =>
          state.character ? { character: { ...state.character, deathSaves } } : state
        ),

      // ---- spell slots ----
      setSlotUsed: (level, used) =>
        set((state) => {
          if (!state.character) return state
          const slots = { ...state.character.spellcasting.slots }
          const slot = slots[level]
          if (!slot) return state
          slots[level] = { ...slot, used: Math.max(0, Math.min(slot.max, used)) }
          return {
            character: {
              ...state.character,
              spellcasting: { ...state.character.spellcasting, slots },
            },
          }
        }),

      // ---- attacks ----
      upsertAttack: (attack) =>
        set((state) => {
          if (!state.character) return state
          const actions = [...(state.character.actions || [])]
          const idx = actions.findIndex((a) => a.id === attack.id)
          if (idx >= 0) actions[idx] = attack
          else actions.push(attack)
          return { character: { ...state.character, actions } }
        }),

      removeAttack: (id) =>
        set((state) =>
          state.character
            ? { character: { ...state.character, actions: (state.character.actions || []).filter((a) => a.id !== id) } }
            : state
        ),

      // ---- spells & inventory (add/remove, e.g. from the compendium) ----
      addSpell: (spell) =>
        set((state) => {
          if (!state.character) return state
          const sc = state.character.spellcasting || { spells: [], slots: {} }
          return {
            character: {
              ...state.character,
              spellcasting: { ...sc, spells: [...(sc.spells || []), spell] },
            },
          }
        }),

      removeSpell: (id) =>
        set((state) => {
          if (!state.character) return state
          const sc = state.character.spellcasting || { spells: [], slots: {} }
          return {
            character: {
              ...state.character,
              spellcasting: { ...sc, spells: (sc.spells || []).filter((s) => s.id !== id) },
            },
          }
        }),

      addInventoryItem: (item) =>
        set((state) =>
          state.character
            ? { character: { ...state.character, inventory: [...(state.character.inventory || []), item] } }
            : state
        ),

      removeInventoryItem: (id) =>
        set((state) =>
          state.character
            ? { character: { ...state.character, inventory: (state.character.inventory || []).filter((i) => i.id !== id) } }
            : state
        ),

      // ---- dice ----
      setRollMode: (rollMode) => set({ rollMode }),

      // A d20 check (ability / save / skill / attack). `mode` defaults to the
      // sticky global rollMode but can be forced per-call.
      rollCheck: ({ label, modifier = 0, type = 'check', mode, meta }) => {
        const useMode = mode || get().rollMode
        const result = rollD20({ modifier, mode: useMode })
        const entry = {
          id: cryptoId(),
          ts: Date.now(),
          kind: 'd20',
          label,
          type,
          meta: meta || null,
          ...result,
        }
        pushLog(set, entry)
        // a single check consumes a one-shot mode? No — keep sticky. UI resets.
        return entry
      },

      // A formula roll for damage / healing / arbitrary dice ("2d6+3").
      rollFormula: ({ label, expression, type = 'damage' }) => {
        const result = rollExpression(expression)
        if (!result) return null
        const entry = {
          id: cryptoId(),
          ts: Date.now(),
          kind: 'formula',
          label,
          type,
          expression,
          ...result,
        }
        pushLog(set, entry)
        return entry
      },

      // Damage from structured parts ([{count,sides,type,bonus}]).
      rollDamage: ({ label, parts, flatBonus = 0, crit = false }) => {
        // On a crit, double the dice (not the flat bonus).
        const expanded = crit
          ? parts.map((p) => ({ ...p, count: (p.count || 1) * 2 }))
          : parts
        const bonus = parts.reduce((s, p) => s + (Number(p.bonus) || 0), 0) + flatBonus
        const result = rollDamageParts(expanded, bonus)
        const entry = {
          id: cryptoId(),
          ts: Date.now(),
          kind: 'damage',
          label: crit ? `${label} (CRIT)` : label,
          type: 'damage',
          ...result,
        }
        pushLog(set, entry)
        return entry
      },

      clearLog: () => set({ rollLog: [] }),
      setActiveTab: (activeTab) => set({ activeTab }),
    }),
    {
      name: 'character-sheet-v1',
      partialize: (state) => ({
        character: state.character,
        rollMode: state.rollMode,
        rollLog: state.rollLog.slice(0, 20),
        activeTab: state.activeTab,
      }),
    }
  )
)

function pushLog(set, entry) {
  set((state) => ({ rollLog: [entry, ...state.rollLog].slice(0, MAX_LOG) }))
}
