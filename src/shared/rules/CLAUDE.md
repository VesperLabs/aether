# shared/rules

The game itself: one folder per gameplay feature, plus `world/` and `events.ts`. See "`shared/rules/`" and "Import rules" in `/ARCHITECTURE.md`.

- Pure TypeScript, strict mode. No Phaser, socket.io, mongodb, express or DOM.
- Imports only `shared/content/`. Never import `shared/network/`.
- Other code imports a feature only through its `index.ts`.
- Rules are pure functions over state. Systems and command handlers stay thin and call them.
- New game events go in `events.ts`. Scenario tests go in `tests/`.
