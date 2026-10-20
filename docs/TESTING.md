# Testing MIR

```bash
npm run typecheck   # strict TS across shared, server, client
npm test            # vitest: engine, matcher, learning, content, objectives, UI, API
npm run lint        # biome
npm run build       # vite client + tsup server
```

## Suites

| File | Covers |
| --- | --- |
| `packages/shared/test/engine.test.ts` | opening mission, zone transitions, effects, money, inventory, dialogue branches |
| `packages/shared/test/matcher.test.ts` | alternative phrasings, politeness, typos, Latin input, word order, rejections |
| `packages/shared/test/learning.test.ts` | evidence weighting, mastery bands, spaced repetition, trimming |
| `packages/shared/test/content.test.ts` | all dialogue nodes reachable, quests resolvable, ids consistent |
| `packages/shared/test/objectives.test.ts` | only authored step markers are exposed |
| `apps/client/test/store.test.ts` | store actions, save/restore, feedback/support |
| `apps/client/test/hit.test.ts` | body-shaped touch targets for characters |
| `apps/client/test/ui.dom.test.tsx` | hooks in `apps/client/test/vitest.config.ts`; intro, HUD, dialogue, phone, journal in happy-dom |
| `apps/server/test/app.test.ts` | session, save validation + versioning, learning sync, AI fallback |

Client DOM tests use their own config (happy-dom, Phaser mocked):

```bash
npx vitest run --config apps/client/test/vitest.config.ts
```

## Manual smoke script (what was verified in a browser)

1. Intro: name field, «Войти во двор», touch controls copy on a phone.
2. Apartment: note highlighted with its Russian label; reading it advances the quest.
3. Courtyard: tap Lidia's head → she is approached and the conversation opens.
4. Phone call: choose a polite answer; type «я в дворе» (accepted, Latin/typo tolerant);
   Anna asks for bread and milk; the metro quest starts.
5. Street → metro: Andrey's route, repeating «Две остановки».
6. Shop: bread and milk purchased for 1 800 ₽ minus 134 ₽; inventory updates; café quest.
7. Reload → same zone, quest, money, inventory. Offline reload → still boots.
8. Phone → Слова: only words actually met; review deck frozen during a session.
9. Journal: active quest with hint and zone, completed quests, letters, map.
