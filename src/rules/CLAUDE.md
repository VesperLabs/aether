# rules

## Moving legacy `server/` code in (example: `stats/`)

1. **Plain input types.** The rule declares the minimal data it reads, not a Phaser object or class (`StatsInput` in `stats/rules.ts`). No `this`.
2. **Pure rule.** It computes and returns a result and mutates nothing (`calculateStats` returns `{ stats, activeSets }`).
3. **Legacy adapter delegates.** The old class, method or route copies its fields into the input, calls the rule and stores the result back (`server/character-stats.ts`, used by `ServerCharacter.calculateStats`). Adapters (`server/*-adapter.ts`) go away once entities are plain data.
4. **Events through the bus.** Declare the event in `events.ts`, emit it from the legacy call site (`doHit` in `server/player.ts`) on the bus (`gameEvents` on the ServerScene for now), and subscribe from the feature's `system.ts` (`subscribeStats`). The subscriber gets a callback for applying the effect, so the feature holds no state. Payloads are plain data.
5. **Tests next to the rule.** Before deleting old code, check the new rule against it on many generated inputs, then drop that temporary test.
6. Legacy code imports `@/rules/<feature>`.
