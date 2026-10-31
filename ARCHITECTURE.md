# Architecture

Aether is a server-authoritative online game.

- **Rules are separate from rendering.** The world is plain data advanced by a fixed tick. The server runs it as the authority; the client runs the same code to predict movement and draws it with sprites that only display it.
- **Plain data plus systems.** Entities are data (position, stats, inventory, buffs). Systems are functions that change that data each tick. No ECS library.
- **Commands in, events and snapshots out.** Clients send intents. The server validates them, applies them, and sends back events plus snapshots and deltas.
- **Content is typed code.** Items, mobs, spells, quests and maps are TypeScript data, so bad references fail to compile.
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
public/      images, audio, maps
scripts/     repo tooling
```

- Imports only point down. Apps never import each other.
- Core has no Phaser, React, DOM or IO.
- Use `@/` for anything outside the current folder (defined only in tsconfig). Relative imports only inside a folder.
- Code outside a feature imports it only through its `index.ts`.
- Exception: Phaser code in `client/` imports `ui/` modules directly (`@/ui/kit/is-mobile`), never the `@/ui` barrel, so `ui/` edits don't reload the whole game.

### `rules/`

One folder per feature (`movement`, `combat`, `inventory`, `quests`, ...), plus:

- `world/`: world state, entity registry, rooms, tick loop, event bus
- `events.ts`: every game event and its payload in one typed map

A feature grows into these files:

```
inventory/
  index.ts      public API, re-exports only
  rules.ts      pure functions over state
  system.ts     per-tick logic
  commands.ts   network command → rules → events
```

Rules are **pure and deterministic**: no `Date.now()`, `Math.random()` or globals. Time, tick and RNG are passed in, so the client can predict and tests can replay.

### `network/`

`commands.ts` holds one zod schema per client→server command; `messages.ts` holds server→client messages; `sync/` holds snapshots, deltas and wire packing. The server never trusts a client value it can compute itself (position, damage, cooldowns).

### Apps

- `server/`: `net/` (one generic dispatcher: look up schema, validate, call the feature's `commands.ts`), `auth/`, `persistence/`, `admin/`, `http/`, `tests/`, `main.ts`
- `client/`: `scenes/`, `views/`, `input/`, `net/` (socket, interpolation, prediction), `audio/`, `hud/` (React, by feature)

A player action flows:

```
client/input → command → server/net (zod) → rules/<feature>/commands.ts
  → world state + events → messages + snapshots → client/views
```

## Conventions

- No `utils`, `helpers`, `common`, `misc`, `lib` or `shared`. Generic code gets a narrow name (`rules/world/geometry.ts`).
- No `*Manager` classes; that logic is a feature's rules and systems.
- One source of truth per type: network types inferred from zod, content types from content definitions.
- Files under 400 lines. Strict TypeScript.
- kebab-case files and folders; named exports only; `.tsx` only with JSX; tests are `.test.ts(x)`, never `.spec`.
- `PascalCase` types and components, `camelCase` functions, events and commands, `SCREAMING_CASE` only for top-level constants. Events are past tense (`mobKilled`), commands are imperative (`moveItem`).

## Tests

- Unit and component tests: next to the code (`foo.ts` → `foo.test.ts`)
- Game scenarios (build a world, run ticks, assert): `src/rules/tests/`
- Socket and database integration: `src/server/tests/`

## Enforcement

`npm run check` runs on every commit (husky) and PR (CI):

- **oxlint**: import rules, `max-lines`, kebab-case, no default exports
- **`scripts/check-structure.ts`**: banned folder names, `*Manager`, `.spec`, `.tsx` without JSX, logic in `index.ts`
- **tsc**: strict typecheck of the whole repo

Legacy exceptions live in one list per config (oxlint `overrides`, the script's allowlist) and may only shrink.
