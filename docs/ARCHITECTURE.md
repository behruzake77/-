# MIR architecture notes

## Why a pure reducer

`packages/shared/src/engine/state.ts` exposes `applyAction(state, action, now) → { state,
events, dialogue, feedback, transition }`. The Phaser scene, the React overlays and the
server tests all go through it. Consequences:

* Quest transitions, money, inventory and relationship changes are testable without a DOM.
* Effects are authored data. A player action can only name a dialogue option or an
  interaction that already exists in `content/`, so state cannot be forged from the client.
* The server can replay an action log (`PUT /api/save` accepts `actions`) or validate a
  snapshot (`GameState` zod schema) — the same rules that ran locally.

`createInitialState()` + `BEGIN` seeds the flat key, 1 800 ₽, Anna as an acquaintance and
quest `q_arrival`.

## Quest and story rules

Quests are explicit data (`content/quests.ts`): ordered steps, each with an authored
`done` condition (`flag`, `item`, `all`, `visited`, `questDone`, …), a hint, a `navTarget`
zone and an optional `marker` interaction the scene highlights. A step's completion can also
be triggered by dialogue effects (flags/knowledge/relationship). Completion effects are
authored too — relationship deltas with memories, knowledge, notes, events, time.

Dialogue is a graph per NPC (`content/dialogues.ts`), each node a line, a choice or a typed
prompt with `next` edges, conditional `variant`s, `audio` flags (phone calls are italic) and
effects on options. NPC entry points are resolved by `resolveNpcDialogue`, which reads flags,
quest state and relationship — so the same NPC behaves differently before and after the call
to Anna, or if you were rude.

The AI never writes to this graph. `/api/ai/interpret` receives the *authored* options for the
current node and may only return one of their ids plus a confidence; the client treats that
as a suggestion the player must confirm. Unknown ids are rejected server-side. With no key
the endpoint degrades to `reason: "ai_unavailable"`.

## Language engine

`matchAnswer(text, options)`:

1. Latin-only input is transliterated to Cyrillic (and the fact is recorded for feedback).
2. Normalise (case, ё, stress marks, punctuation) and stem inflections.
3. Score each option by anchor-group coverage (`must`), fuzzy similarity to model answers
   (`canonical`) and optional pleasant words (`nice`).
4. Accept when all anchor groups hit, or a model answer is close, or the blended score is
   high; otherwise `close` (retry with guidance) or `unclear` (never a failure screen).
5. Add conservative corrections: politeness, ты/вы mixing, Latin input, a missing phrase.

`supportWeight()` scales the recorded evidence by the help used (translation ×0.55, hint
×0.6, AI assist ×0.7, non-typed ×0.9). `learningSummary`, `masteryMap`, `masteryBand` and
`dueWords` derive mastery from those rows with time decay; nothing is invented or decorative.
Retention is measured by later re-encounters and the phone review deck, which counts a
revealed answer as a hint rather than as recall.

## Scene layer

`MirScene` builds a zone from data: procedural floor tiles, `paintProp()` for every prop,
interaction markers, NPC figures with idle/wander animation, weather (rain, leaves, dust,
window rain), ambient tint and camera bounds/zoom. Movement is WASD/arrows or tap-to-walk:
a small grid A* routes around props, and a stand-point search finds a reachable spot next to
the target (benches and counters otherwise make the geometric approach point illegal).
Characters are hit-tested as a body capsule (`game/hit.ts`), not a circle at their feet.

Cameras fade between zones; the HUD is plain React above the canvas so it stays crisp and
accessible (labels, roles, `aria-live` toasts, Escape closes overlays).

## Persistence and sync

* Local: `mir.save.v1` (validated snapshot), `mir.actionlog.v1`, settings, device id.
* Sync: `POST /api/session` → token (hashed at rest in `mir_users`), `PUT /api/save` with
  `baseVersion` for optimistic concurrency, `GET /api/save`, `GET /api/learning`.
* Database: Drizzle over `pg` when `DATABASE_URL` answers, otherwise PGlite on disk with the
  same schema. If neither is available the client continues from localStorage — the game is
  local-first by design.
* `sw.js` precaches the shell, serves navigations network-first with a cached fallback, and
  never caches `/api/*`.

## Known technical debt

* `state.ts` is a large reducer; splitting per-action modules would help once chapter two
  adds more verbs.
* Assets are procedural; the `props.ts`/`portraits.ts` boundary is the replacement point.
* No committed Playwright suite yet (see README next steps).
