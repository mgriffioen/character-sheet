# ⚔️ Character Sheet

An interactive **D&D 5e character sheet** built for a tablet in portrait mode —
your own pocket D&D Beyond. Tap any ability, save, skill, or attack to roll it,
track HP and spell slots during play, and import your hero straight from a
**D&D Beyond** character export.

Everything runs in the browser. Your character is stored **on your device** (in
local storage) — nothing is uploaded anywhere.

---

## Features (today)

- **D&D Beyond import** — paste your character's JSON and the app computes the
  real numbers (ability scores from base + racial + ASI + items, proficiency
  bonus, saves, skills, HP, AC, speed, spells, inventory, features, attacks).
- **Tap-to-roll everything** — ability checks, saving throws, skills,
  initiative, attacks (to-hit + damage, with crits), and a free-form dice tray
  (`d4`–`d100` and expressions like `2d6+3`).
- **Advantage / disadvantage** toggle that applies to every d20 roll.
- **Roll log** with the full breakdown of each roll (which dice, what was kept).
- **HP management** — damage/heal, temporary HP, death saves.
- **Spell slots & spellcasting** — save DC, attack bonus, tap to expend slots,
  spells grouped by level with full descriptions.
- **Long rest** — restores HP, spell slots, death saves, and half your hit dice.
- **Editable & overridable** — every derived value can be hand-tweaked if the
  import doesn't match (homebrew, unusual items), and your override sticks.
- **Export / backup** your character as JSON to move it between devices.

Built for **portrait tablet** use: large touch targets, a persistent dice tray,
and a dark "leather & parchment" theme that's easy on the eyes at the table.

## Roadmap (planned)

- In-app character builder using the free **SRD APIs** (pick race/class/spells).
- Spell/item/rules **lookup browser** powered by
  [dnd5eapi.co](https://www.dnd5eapi.co/) and [Open5e](https://open5e.com/).
- Multiple characters / party roster.
- Short rest, hit-dice spending, concentration tracking, conditions.
- Customizable attacks and actions added by hand.

---

## Run it locally

```bash
npm install
npm run dev
```

Vite prints a local URL **and** a network URL (the dev server is exposed on your
LAN). Open the **network** URL on your tablet — both devices need to be on the
same Wi-Fi.

Other scripts:

```bash
npm test       # unit tests for the dice engine and the D&D Beyond parser
npm run smoke  # renders every screen with the sample character (jsdom) to catch UI errors
npm run build  # production build into dist/
npm run preview
```

## Deploy to GitHub Pages

A workflow is included at `.github/workflows/deploy.yml`.

1. In your repo: **Settings → Pages → Build and deployment → Source:
   "GitHub Actions"**.
2. Push to `main` (or this branch). The workflow tests, builds, and deploys to:
   `https://<your-username>.github.io/character-sheet/`
3. Open that URL on your tablet and **Add to Home Screen** for an app-like,
   full-screen experience.

> The Vite `base` is set to `/character-sheet/` for the build so assets resolve
> on the project Pages URL. If you rename the repo, update `base` in
> `vite.config.js`.

---

## Importing from D&D Beyond

D&D Beyond has no official API, but a character's raw data is available as JSON.
The export is **uncomputed** (no final AC/HP/save totals), so this app replays
the 5e math to produce the sheet.

1. On D&D Beyond, open your character → the **gear / "Manage"** menu → set
   **Character Privacy** to **Public**. Without this, the link below returns
   `403 Forbidden`.
2. Find your character ID — the number in your sheet URL:
   `dndbeyond.com/characters/`**`12345678`**
3. Open (now public):
   `https://character-service.dndbeyond.com/character/v5/character/12345678`
4. Copy all of that JSON and paste it into the app's import screen (or save it
   as a `.json` file and upload it).

Not sure yet? Hit **"Try a sample character"** to explore the app with a fully
built level-5 bard.

> Because the export is raw and D&D Beyond's format can change, a value might
> occasionally come out wrong (especially for homebrew or unusual magic items).
> Every number on the sheet is editable, and your edits are saved — so you can
> always correct it in a couple of taps.

---

## Architecture

```
src/
  rules/        Pure D&D 5e math (modifiers, proficiency, derived values) + constants
  dice/         Dependency-free dice engine (expressions, d20 + adv/dis, damage)
  model/        The app-internal character model (decoupled from any source format)
  ddb/          D&D Beyond JSON → internal model parser (+ a tested sample fixture)
  store/        Zustand store with localStorage persistence and roll actions
  components/    Header, dice tray, roll log, import/welcome, character menu
  tabs/          Skills, Combat, Spells, Inventory, Features
  utils/         HTML→text, roll formatting, time
scripts/        jsdom render smoke test (bundled with esbuild)
```

Design principle: importers translate into one **internal character model**, and
the whole UI reads only from that model. Derived numbers are computed on the fly,
except where the user has pinned an override. This keeps the app independent of
D&D Beyond's format and makes new import sources (or a manual builder) easy to
add later.

### Free data sources

- **[dnd5eapi.co](https://www.dnd5eapi.co/)** — REST + GraphQL SRD data (spells,
  classes, equipment, rules). No key required.
- **[Open5e](https://open5e.com/api-docs)** — broader open content. No key.

(These power planned lookup/builder features; the importer needs no network —
D&D Beyond's export already contains spell and item text.)

## Tech

React + Vite, Zustand for state, plain CSS. No backend, no tracking, no
accounts. Tested with Node's built-in test runner.

## License & content

This tool contains no Wizards of the Coast rules text. Imported character
content stays on your device. SRD data accessed via the APIs above is provided
under the Open Gaming License / Creative Commons by those projects.
