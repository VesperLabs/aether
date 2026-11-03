# Architecture

Aether is a server-authoritative online game.

- **Rules are separate from rendering.** The world is plain data advanced by a fixed tick. The server runs it as the authority; the client runs the same code to predict movement and draws it with sprites that only display it.
- **Plain data plus systems.** Entities are data (position, stats, inventory, buffs). Systems are functions that change that data each tick. No ECS library.
- **Commands in, events and snapshots out.** Clients send intents. The server validates them, applies them, and sends back events plus snapshots and deltas.
- **Content is typed code.** Items, mobs, spells, quests and maps are TypeScript data, so bad references fail to compile. Ids are typed so a quest pointing at a missing item is a compile error and editors autocomplete them.
- **Features talk through events.** `mobKilled` is handled by loot, stats and quests; features never call each other's internals.

> Migration in progress: older code doesn't match this yet. All new code does.

## Layout and imports

```
src/
  content/   core: items, mobs, spells, quests, maps      imports nothing
  rules/     core: the game itself                        imports content
  network/   core: client↔server messages                 imports rules, content, socket.io types
  ui/        React views of core, by feature; kit/ for generic widgets
  server/    app: game server                             core only, never ui
  client/    app: game in the browser                     core + ui
  wiki/      app: wiki site                               core + ui
  bots/      app: headless players over socket.io         core only, never ui
  sim/       app: real server + bots on a controlled clock  server + bots, never ui
public/      images, audio, maps
scripts/     repo tooling
```

- Nothing floats. A folder's top level holds only subfolders and entry points (`main.ts`, `game.tsx`, `app.tsx`, `index.html`, `vite.config.ts`, `*.d.ts`, `style.css`, and `rules/events.ts`). Every other file lives in a folder named for its feature, and a folder past about 12 files splits by feature.
- Imports only point down. Apps never import each other, except `sim/`, the top layer that composes `server/` and `bots/`.
- Core has no Phaser, React, DOM or IO.
- Use `@/` for anything outside the current folder (defined only in tsconfig). Relative imports only inside a folder.
- No barrels: import from the file that defines a thing, never from an `index.ts` that re-exports it. Existing barrels are legacy and shrink as code is touched.
- Exception: Phaser code in `client/` imports `ui/` modules directly (`@/ui/kit/is-mobile`), never the `@/ui` barrel, so `ui/` edits don't reload the whole game.

### `rules/`

One folder per feature (`movement`, `combat`, `inventory`, `quests`, ...), plus:

- `world/`: world state, entity registry, rooms, tick loop, event bus
- `events.ts`: every game event and its payload in one typed map

A feature grows into these files:

```
inventory/
  rules.ts      pure functions over state
  system.ts     per-tick logic
  commands.ts   network command → rules → events
```

Rules are **pure and deterministic**: no `Date.now()`, `Math.random()` or globals. Time, tick and RNG are passed in, so the client can predict and tests can replay. Systems and command handlers stay thin and call the rules. Scenario tests go in `rules/tests/`.

### `network/`

`commands.ts` holds one zod schema per client→server command; `messages.ts` holds server→client messages; `sync/` holds poses (every position, whole on every tick, safe to lose) and statuses (flags and vitals, sent only when they change). The server never trusts a client value it can compute itself (position, damage, cooldowns).

`session/` is the non-visual half of a client, shared by the browser client and bots: `mirror.ts` (what a player sees, built from messages and sync; every server message is handled or explicitly ignored, checked by the compiler) and hero control and motion (intent → predicted step with tile collision → throttled `playerInput`, time passed in). The client draws the mirror; a bot runs a brain on it. Never reimplement this in an app.

### Apps

- `server/`: `net/` (one generic dispatcher: look up schema, validate, call the feature's `commands.ts`), `auth/`, `persistence/`, `admin/`, `http/`, `config/` (the only reader of env, via `main.ts`), `app/` (`createApp(config, { db, clock, seed, logger })`, listens on any port incl. 0), `log/`, `main.ts`. Server code takes its clock, seed and logger as inputs: no `process.env`, `console` or module-level state outside `main.ts`, so many servers can run in one process.
- `client/`: `scenes/`, `views/`, `input/`, `net/` (socket, interpolation; feeds the session mirror), `audio/`, `hud/` (React, by feature)
- `bots/`: `brains/` (pure `(view, tick, rng) → intents`, one per file), `bot.ts` (a brain driving a session), `main.ts` (bots against a running server, e.g. ambient players live). Bots log in through the normal login with accounts flagged `isBot`; the server never branches gameplay on it.
- `sim/`: `sim-clock.ts` (manual: the test advances time; turbo: as fast as the CPU allows), `sim-server.ts` (real server in-process, port 0, fake DB, seeded, memory logger), `soak/` (long many-bot runs, on demand), `main.ts` (a local world full of bots)

A player action flows:

```
client/input → command → server/net (zod) → rules/<feature>/commands.ts
  → world state + events → messages + snapshots → client/views
```

## Conventions

- Generic code gets a narrow name in its proper home (`rules/world/geometry.ts`), never a grab-bag folder.
- `*Manager` logic belongs in a feature's rules and systems.
- One source of truth per type: network types inferred from zod (never write the same shape twice), content types from content definitions.
- `PascalCase` types and components, `camelCase` functions, events and commands, `SCREAMING_CASE` only for top-level constants. Events are past tense (`mobKilled`), commands are imperative (`moveItem`).

## Tests

Most tests should be fast, pure and in-process; only the top layer touches sockets or a database.

- **Unit and component tests**: next to the code (`foo.ts` → `foo.test.ts`). Pure rules need no mocks: pass in tick, time and a seeded RNG.
- **Game scenarios** (build a world, run ticks, assert): `src/rules/tests/`. The default for gameplay bugs; no server, no network.
- **Sim tests** (real server, real sockets, controlled clock): `*.sim.test.ts` next to the feature they test (`server/party/party.sim.test.ts`), never in a tests folder. Built on `sim/sim-server.ts` with bots or raw clients. Advance ticks, wait on events, never `sleep`. They run as their own vitest project, serially. Persistence tests that need real Mongo use a throwaway in-memory MongoDB per file, never a shared or remote one.
- **Soak runs** (`sim/soak/*.soak.ts`): many bots for long game-time in turbo mode, asserting no errors in the memory logger. On demand, not in `npm run check`.
- **Bots** connect like a real client and send only network commands, so the server stays authoritative and they exercise the real path. Mob and NPC brains are not bots: they live in `rules/` and are tested as scenarios.
- Same seed, same result: a flaky test is a bug, fixed or deleted, never retried.

## Enforcement

`npm run check` runs on every commit (husky) and PR (CI):

- **oxlint**: import direction and cycles, files under 400 lines, kebab-case names, named exports only, no `Date.now()`/`Math.random()` in `rules/`, no `@/ui` barrel from Phaser client code, no raw `socket.on` outside `net/`
- **`scripts/check-structure.ts`**: banned folder names (`utils`, `helpers`, `common`, `misc`, `lib`, `shared`), `*Manager`, `.spec` (tests are `.test.ts(x)`), `.tsx` without JSX, `index.ts` barrels
- **tsc**: strict typecheck of the whole repo
- **oxfmt**: formatting

Legacy exceptions live in one list per config (oxlint `overrides`, the script's allowlist) and may only shrink.
