# shared/rules

The game itself: one folder per gameplay feature, plus `world/` and `events.ts`. See "`shared/rules/`" and "Import rules" in `/ARCHITECTURE.md`.

- Pure TypeScript, strict mode. No Phaser, socket.io, mongodb, express or DOM.
- Imports only `shared/content/`. Never import `shared/network/`.
- Other code imports a feature only through its `index.ts`.
- Rules are pure functions over state. Systems and command handlers stay thin and call them.
- New game events go in `events.ts`. Scenario tests go in `tests/`.

## Pattern for moving a feature in (example: `stats/`)

1. **Plain input types.** The rule declares the minimal data it reads, not a Phaser object or class (`StatsInput` in `stats/rules.ts`). No Phaser, no `this`.
2. **Pure rule.** It computes and returns a result and mutates nothing (`calculateStats` returns `{ stats, activeSets }`).
3. **Legacy adapter delegates.** The old class, method or route copies its fields into the input, calls the rule and stores the result back (`server/character-stats.ts`, used by `ServerCharacter.calculateStats`). Delete the adapter in Phase 4 when entities become plain data.
4. **Events through the bus.** Declare the event in `events.ts` (`mobKilled`), emit it from the legacy call site (`doHit` in `server/player.ts`) on the bus (`gameEvents` on the ServerScene for now), and subscribe from the feature's `system.ts` (`subscribeStats`). The subscriber gets a callback for applying the effect, so the feature holds no state. Payloads are plain data.
5. **Tests next to the rule** (`rules.test.ts`, `system.test.ts`). Before deleting old code, check the new rule against it on many generated inputs, then drop that temporary test.
6. `index.ts` only re-exports. Legacy code imports `@/shared/rules/<feature>`.
