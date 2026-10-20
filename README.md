# MIR — Мир без перевода

An immersive Russian-learning life sim. You arrive in Северогорск with a key, a dead
phone and no Russian. You find your flat, borrow a neighbour's phone, cross the street
to the metro, buy bread and milk, and meet Anna in a café — and the language comes out
of those errands rather than out of a lesson list.

Built as a real playable browser game: a Phaser 3 world, authored dialogue with
semantic answer matching, a learning engine that records only real evidence, and a
Fastify + PostgreSQL persistence layer that falls back to embedded Postgres locally.

```
┌───────────── browser ─────────────┐        ┌─────────── node ───────────┐
│ React shell (HUD, dialogue, books)│        │ Fastify API                │
│ Phaser scene (world, movement)    │ ─────► │  /api/session /api/save    │
│ zustand store  ── shared engine ──┼──────► │  /api/ai/interpret         │
│ localStorage save + action log    │        │ PostgreSQL or PGlite       │
└───────────────────────────────────┘        └────────────────────────────┘
```

The **same** TypeScript engine (`@mir/shared`) runs in the browser and on the server, so
quest rules, the answer matcher and the learning model can be unit-tested without a browser.

---

## Run it

Node 22.12+.

```bash
npm install
npm run build      # client → dist/client, server → dist/server
npm start          # http://localhost:8787  (http://0.0.0.0:8787 in a container)
```

Development (Vite HMR on :5173 proxying `/api` to :8787):

```bash
npm run dev        # both processes
# or separately
npm run dev:server
npm run dev:client
```

Quality gates:

```bash
npm run typecheck   # shared + server + client, strict
npm test            # 66 engine/content/UI/server tests
npm run lint        # Biome
npm run build       # production build
```

Nothing is required in `.env` to play. Copy `.env.example` only if you want
PostgreSQL or an AI layer.

### Optional configuration

| Variable | Effect |
| --- | --- |
| `PORT` | API port (default `8787`) |
| `DATABASE_URL` | Use real PostgreSQL. Unreachable → automatic PGlite fallback |
| `DATA_DIR` | Where the embedded database lives (default `./data`) |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | OpenAI-compatible interpretation layer. Absent → fully authored dialogue |

---

## What is in the game

**World — one compact neighbourhood, seven hand-composed interiors/outdoors**

| Place | What happens there |
| --- | --- |
| Двор на улице Мира | Arrival, Lidia on the bench, Sasha, Artyom, the cat Муся, notice board, laundry, puddles |
| Квартира 27 | Anna's note, the kettle, the suitcase, the bed (end the day) |
| Улица Мира | Shop, дом быта, café, metro entrance, busker, crossing, puddles |
| Магазин «У дома» | Nina behind the counter; bread, milk, tea, bags with real prices |
| Метро «Площадь Мира» | Andrey, the map, the ticket office, the turnstiles |
| Кафе «Тёплый угол» | Kostya's coffee trial, Anna after the phone call |
| Дом быта | Valentina, the notice board, the key machine |

Every interactive prop has authored Russian text, most carry vocabulary, and the current
objective is labelled in-world in Russian (no floating quest arrows).

Content: 7 zones, 24 authored dialogues / 166 nodes, 147 vocabulary entries, 7 quests,
9 characters.

**People — nine authored characters**, each with a personality brief, palette, voice
rate/pitch and relationship state: Anna (illustrator, warm, chaotic), Lidia Petrovna
(retired librarian, dry, precise), Sasha (nine, fast, conspiratorial), Artyom (courier,
always late), Nina (shop assistant, deadpan), Andrey (metro worker, fatherly,
answers a question with a question), Kostya (café owner, ironic), Valentina (дом быта),
Муся the cat.

**Story** — three required missions and four optional threads:

1. **Первые шаги** — find the flat, read the note, borrow Lidia's phone, call Anna.
2. **Метро «Площадь Мира»** — find the entrance, ask Andrey the way, repeat the route.
3. **Хлеб и молоко** — enter the shop, buy bread and milk.
4. **Тёплый угол** — meet Anna (starts when 1–3 are done).
5. Optional: **cat** (find Муся for Lidia), **ball** (return Sasha's ball),
   **job** (ask about work at дом быта).

Choices persist: who you spoke to, what you promised, how politely you asked, what you
already know. NPC dialogue selection reads flags, quest state, relationship and knowledge.

---

## How the teaching works

Six abilities are tracked separately — recognition, listening, reading, recall, written
production, retention:

```ts
type Skill = "recognition" | "listening" | "reading" | "recall" | "production" | "retention";
```

* **No answer keys with one sentence.** Each option declares semantic anchor groups
  (`must: [["позвонить","звонок"]]`), model answers (`canonical`) and pleasant extras
  (`nice`). A reply is accepted when the *meaning* is recognisable; a typo, a missing case
  ending or different word order never fails the player.
* **Latin input is understood.** `izvinite mozhno pozvonit` → `извините можно позвонит`,
  with a gentle note showing the Cyrillic.
* **Corrections are kind.** «Дайте мне…» suggests «Дайте, пожалуйста…». Mixing ты/вы is
  explained. The mission succeeds either way.
* **Support is measured.** Looking at the translation (×0.55), using a hint (×0.6),
  listening (also recorded) and typing vs. choosing all weight the evidence. A word
  "known" through a revealed translation is not counted as unaided recall.
* **Evidence, not points.** Every answer writes a `LearningEvidence` row
  (vocab, skill, outcome, support, source). Mastery = weighted, time-decayed estimate over
  those rows; retention is derived from later re-encounters and the phone's review deck.
* **Adaptive help.** `supportFor()` decides whether a line's translation shows automatically
  based on how much help this player has needed; translations can be hidden entirely in
  settings.
* **Review is real.** The phone's «Слова» tab lists only words the player actually met, and
  «повторить» builds a frozen session deck from due/low-strength words — the deck cannot
  change under your fingers mid-question.

Audio uses the browser's own `speechSynthesis` (ru-RU), at each character's rate and pitch,
with an explicit replay button and graceful silence where no Russian voice exists.

---

## Architecture

```
packages/shared/src
  content/      vocabulary, items, notes, world (zones/props/interactions), npcs,
                quests, dialogues  ← all authored story rules
  engine/
    state.ts      pure reducer: actions → state + events (quests, effects, inventory)
    conditions.ts  declarative condition evaluation
    matcher.ts     semantic answer matching + support weighting
    russian.ts     normalisation, stemming, transliteration
    learning.ts    mastery, bands, spaced-repetition due dates
    objectives.ts  which authored marker is current
  schemas.ts    zod validation for saved state and API payloads

apps/client/src
  game/         Phaser scene, procedural art (props, figures, textures), hit geometry
  ui/           Intro, HUD, Dialogue, Journal, Phone, Review, Toasts
  state/        zustand store + persistence/sync
  audio/        speech synthesis + ambience
  art/          portraits, city cover

apps/server/src
  app.ts        Fastify routes, save validation, AI endpoint + rate limit
  store.ts      users / saves / learning events / dialogue events (Drizzle SQL)
  db/           schema, migrations, PostgreSQL-or-PGlite selection
  ai/provider.ts provider-agnostic OpenAI-compatible interpreter
```

**Reducer-first game logic.** The client never mutates quest progress directly; it
dispatches `GameAction`s (`BEGIN`, `ENTER_ZONE`, `INTERACT`, `CHOOSE`, `TYPE`, `ADVANCE`,
`REVIEW`, `TICK`, …) into `applyAction()`. Effects only ever come from shipped content, so a
malicious client cannot grant itself items. Online saves are re-validated on the server with
zod and versioned (`baseVersion`) to prevent clobbering.

**AI cannot change the world.** The provider may only choose one of the authored option ids
for a node and report confidence. The server rejects unknown ids, the client shows it as a
suggestion the player must confirm, and rewards/quests are applied only by the reducer.
Without a key the endpoint answers `reason: "ai_unavailable"` and the game carries on with
authored dialogue and the local matcher — no feature is blocked.

---

## Persistence

* **Local-first.** Every action updates `localStorage` (`mir.save.v1`) plus an action log.
  Reloading restores the exact zone, position, quests, inventory and learning evidence.
* **Service worker.** Precached shell + runtime cache; a reload with the network offline
  still boots into the saved game. `/api/*` is never cached.
* **Optional account sync.** `POST /api/session` issues a token bound to a device id;
  `PUT /api/save` stores a validated snapshot with optimistic versioning;
  `GET /api/save` and `GET /api/learning` allow another device to continue.
  No email, password or personal data is stored — only a device id and optional nickname.
* **Database.** PostgreSQL via Drizzle when `DATABASE_URL` is reachable, otherwise embedded
  PGlite in `DATA_DIR` with the same schema and SQL. If neither can start, the client still
  works from localStorage.

Data model: `mir_users`, `mir_saves` (jsonb state + actions + version),
`mir_learning_events`, `mir_dialogue_events`. NPC memories, relationships, quest progress,
inventory and vocabulary evidence live inside the validated game-state document, because
they are always read and written together as one atomic save.

---

## PWA and devices

Installable manifest (ru, standalone, maskable icons), safe-area aware HUD, touch-first
controls: tap the ground to walk (grid A* around props), tap a character anywhere on their
body to talk, tap a door or shelf to use it. Keyboard WASD/arrows + E/space on desktop.
Phaser key captures are cleared so typing spaces in Russian answers works.

The layout is deliberately different on phones: the quest chip and inventory move to the
bottom corners, the interaction prompt sits above the thumb, toasts collapse to one readable
card, and dialogue actions are sticky so landscape play still reaches «Дальше».

---

## Tests

`npm test` — 66 tests, all passing:

* **engine** — opening mission, zone transitions, quest state, inventory, money, effects
* **matcher** — alternative phrasings, politeness variants, typos, Latin input, word order,
  unrelated answers rejected, stress-insensitive
* **learning** — mastery weighting, bands, retention scheduling, evidence trimming
* **content** — every dialogue node reachable, every quest resolvable, ids consistent
* **objectives** — only authored markers are highlighted
* **hit geometry** — tapping a character's head/torso registers (regression)
* **store / UI** — zustand actions, save/restore, HUD and dialogue rendering in happy-dom
* **server** — session, save validation/versioning, learning sync, AI fallback

Browser verification was done with a scripted headless Chromium pass over desktop
(1440×900), tablet (1024×768), phone portrait (390×844) and phone landscape (844×390):
intro → arrival → flat → note → Lidia → call → street → metro → Andrey → shop → bread and
milk → café, plus reload, offline reload, journal, phone, word list and review session.

---

## Known limitations

* Art is procedural (canvas-drawn) rather than illustrated; portraits are vector
  compositions. Designed to be replaceable without touching game logic.
* Speech depends on the device's Russian TTS voice. Where none exists the replay buttons
  hide instead of playing silence.
* The AI layer is optional and unexercised in this environment (no key); the local matcher
  is the production path.
* Account sync is single-token per device; there is no login UI or merge-conflict resolution
  beyond version rejection and explicit replace.
* The metro interior is a scene, not a ride — the trip to the centre is authored as the next
  chapter.
* No end-to-end Playwright suite is committed (the sandbox had no browser); the browser
  passes above were scripted ad hoc. Adding `@playwright/test` with those flows is the first
  item in the next milestone.

## Next milestone

1. Commit the scripted browser flows as Playwright tests (desktop + mobile projects) in CI.
2. Chapter two: the metro ride, «Театральная», and a second neighbourhood with new NPCs.
3. Richer NPC memory surfacing (referencing past promises in new dialogue) and a
   relationship-gated optional story with Valentina.
4. Signed-in sync UI with a real conflict-resolution screen and multi-device pull/merge.
5. Replace procedural portraits/props with a licensed or commissioned tileset behind the
   existing `props.ts` / `portraits.ts` boundaries.
