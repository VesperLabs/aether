# TODO

Migration to the structure in `ARCHITECTURE.md`. Work through the phases in order. Keep `npm run check` passing after every step.

## Phase 1: Tooling and guardrails

- [x] Remove npm workspaces: one root `package.json` (move `wouter` from `web/`), delete the `client/`, `web/`, `ui/` and `shared/` package.json files, run the client and wiki Vite builds from root scripts with `--config`, and update the Dockerfile's manifest copies
- [x] Move the code folders under `src/`: `server/` → `src/server/`, `client/` → `src/client/`, `web/` → `src/wiki/`, `ui/` → `src/ui/`, `shared/` → `src/shared/` (contents get sorted in Phase 2). Update scripts, Vite configs, `build.server.js`, the Dockerfile, `PUBLIC_DIR` and the GitHub workflows.
- [x] Replace the `@aether/*` tsconfig paths with a single `"@/*": ["./src/*"]`. Enable it in the Vite configs (`resolve.tsconfigPaths`, or the `vite-tsconfig-paths` plugin if that setting isn't available) and confirm tsx, esbuild and Vitest resolve it.
- [x] Add `tsconfig.strict.json` (strict mode, no `allowJs`) covering `src/shared/content/`, `src/shared/rules/` and `src/shared/network/`, and add it to `npm run typecheck`
- [x] Rename every file and folder to kebab-case as part of the move (use `git mv`, going through a temporary name for case-only renames so macOS picks them up)
- [x] Convert default exports to named exports and update the imports
- [x] oxlint: import rules from `ARCHITECTURE.md` via `no-restricted-imports` overrides, `max-lines` at 400, `unicorn/filename-case` (kebab-case) and `import/no-default-export` (off for tool config files), with existing violations listed in an overrides block. Confirm each rule exists in the installed oxlint version.
- [x] Add `scripts/check-structure.ts` and add it to `npm run check`. It rejects banned and non-kebab-case folder names, `*Manager` classes, `.spec` files, `.tsx` files without JSX and `index.ts` files containing logic, with an allowlist of existing violations.
- [x] Add `CLAUDE.md` files in `src/shared/rules/`, `src/shared/network/` and `src/shared/content/` as those folders are created

## Phase 2: Content and network

- [x] Create `src/shared/content/`: convert `shared/data/*.json` to typed TS definitions, and move `ItemBuilder`, `QuestBuilder` and maps there. Let the compiler check cross-references (quest → item, mob → loot).
- [x] Create `src/shared/network/`: move `netSnapshot`, `tickDelta`, `wireTick`, `netWire` and `tickState` into `network/sync/`
- [x] Write a zod schema in `network/commands.ts` for every client→server event in `GameServer.ts`, and types for every server→client message in `network/messages.ts`. Wire them into Socket.IO's typed server and client.
- [x] Replace the `socket.on` handlers with one generic dispatcher in `src/server/net/`
- [x] Split the rest of `GameServer.ts` into `src/server/auth/`, `admin/` (cheat commands, admin-only), `http/` (routes from `main.ts`) and `persistence/` (`server/db/`)
- [ ] Replace the wiki's duplicate `PlayerRender` and `Slot` with `src/ui/` (skipped: the wiki `PlayerRender` already wraps `ui`'s; the wiki `Slot` and tooltip differ visually from the client ones, see PR notes)

## Phase 3: Move rules into `src/shared/rules/`, one feature at a time

Do the pure ones first. Write tests as each one moves.

- [x] `rules/events.ts` and an event bus in `rules/world/`
- [x] `stats`: `calculateStats`, `calculateExpValue`, `calculateNextMaxExp` from `server/utils.ts`
      (Remaining legacy hooks: `assignExp` level-up on `server/character.ts`, `useGetBaseCharacterDefaults` in `server/utils.ts` for starting items and spawn.)
- [ ] `inventory`: `moveItem`, `dropItem`, `consumeItem` from `GameServer.ts` and the inventory methods on `shared/Character.ts`
- [x] `loot` (`LootManager`), `party` (`PartyManager`), `quests` (quest methods on `Character`, `Quest.ts`)
- [ ] `combat`, `spells`, `buffs` (methods on `shared/Character.ts`, `server/Character.ts`, `SpellManager`, `Spell.ts`)
- [ ] `ai` (`server/Npc.ts`)
- [ ] Move state packing (`get*RoomState`, `get*CharacterState`) into `network/sync/`
- [x] Route mob kills to loot, stats and quests through `mobKilled`

## Phase 4: Game core without Phaser on the server

- [ ] `movement`: tilemap collision, box collision and movement math, easystar pathfinding (from `Room.ts`)
- [ ] A `World` object in `rules/world/` replacing `ServerScene`, with a fixed-tick loop
- [ ] Delete `server/Phaser.ts`, then remove `canvas`, `jsdom`, the `require` swap and the canvas build packages from the Dockerfile
- [ ] Make game entities plain data. `Character` no longer extends `Phaser.GameObjects.Container`.
- [ ] Client: sprites to `src/client/views/` as displays of game state, input to `input/`, interpolation and prediction to `net/`, and run the rules on the client for movement prediction
- [ ] Client: group `client/ui/` into `src/client/hud/<feature>/`
- [ ] Remove any leftover loose files from `src/shared/` so it holds only `content/`, `rules/` and `network/`
- [ ] Convert the remaining `.js` files to TypeScript and turn on strict mode repo-wide
- [ ] Replace lodash with modern JS where possible

## Done when

- Every legacy exception list is empty
- Strict mode is on for the whole repo
- `src/shared/rules/tests/` has scenario tests covering combat, loot, inventory and quests
