# Architecture

Aether is a server-authoritative online game. The design follows the way modern networked games are usually built:

1. **The rules are separate from what's on screen.** The game world is plain data advanced by a fixed tick, with no graphics, sockets or database. The server runs it as the authority. The client runs the same code to predict movement and draws the world with sprites that only display it.
2. **Plain data plus systems.** An entity is data: position, stats, inventory, buffs. Systems are functions that run every tick and change that data. There is no ECS library; plain state plus system functions is enough at this scale.
3. **Commands in, events and snapshots out.** Clients send what they want to do. The server validates each command, applies it to the world, and sends back events plus state snapshots and deltas.
4. **Content is typed code.** Item, mob, spell, quest and map definitions are TypeScript data, so the compiler catches bad references (a quest pointing at an item that doesn't exist) and editors autocomplete ids.
5. **Features talk through events.** For example, `mobKilled` is handled by loot, stats (experience) and quests. Features don't call each other's internals.

> Migration in progress: the current code does not match this yet. See `TODO.md`. All new code follows this document.

## Layout

The top level of `src/` answers **where does this code run?** The next level answers **what is it?**

```
src/
  shared/          # runs on both server and client
    content/       # items, mobs, spells, quests, maps
    rules/         # the game itself: no graphics, no network, no database
    network/       # messages between client and server
  server/          # the game server
  client/          # the game in the browser
  wiki/            # the wiki site
  ui/              # React components used by client and wiki
public/            # images, audio, maps
scripts/           # repo tooling
```

One `package.json`, one lockfile, one `tsconfig.json`. No workspaces. The repo root holds only config files and the folders above.

### Imports

Use the `@/` alias (tsconfig `"paths": { "@/*": ["./src/*"] }`) for anything outside the current folder. Use relative imports only inside a feature or folder.

```ts
import { items } from "@/shared/content";
import { moveItem } from "@/shared/rules/inventory";
import { commands } from "@/shared/network";
import { Button } from "@/ui";
```

tsx and esbuild read the alias from tsconfig on their own. Vite and Vitest read it through `resolve.tsconfigPaths` (or the `vite-tsconfig-paths` plugin). tsconfig is the only place it's defined.

### `shared/rules/`

Every folder in `rules/` is one gameplay feature: `movement`, `combat`, `spells`, `buffs`, `stats`, `inventory`, `loot`, `ai`, `quests`, `party`, `chat`.

Two things in `rules/` are not features:
- `world/`: world state, entity registry, rooms, tick loop and event bus
- `events.ts`: every game event and its payload in one typed map, so the full list of what can happen in the game is in one place

A feature starts as a folder with only `index.ts`. Add files as it grows, using these names:

```
inventory/
  index.ts      # public API: the only file other code may import
  rules.ts      # pure functions over state: canEquip, moveItem, stackItems
  system.ts     # per-tick logic
  commands.ts   # handles network commands → calls rules → emits events
  rules.test.ts
```

### `shared/network/`

```
network/
  commands.ts   # client→server: one zod schema per command, types inferred from it
  messages.ts   # server→client messages
  sync/         # snapshots, deltas, wire packing
```

### `server/`

```
server/
  net/           # socket transport and command dispatcher
  auth/          # login, register, demo login
  persistence/   # mongo, save/load characters
  admin/         # cheat and debug commands, admin-only
  http/          # express routes, peer proxy
  tests/         # socket and database integration tests
  main.ts
```

`server/net/` is one generic dispatcher: it looks up a command's schema, validates the payload and passes it to the rules. Adding a command never means writing a new socket handler.

### `client/`

```
client/
  scenes/        # Phaser scenes
  views/         # sprites that display game state
  input/         # keyboard, joystick, crosshair → commands
  net/           # socket client, interpolation, prediction
  audio/
  hud/           # React UI grouped by feature: inventory/, quests/, social/, auth/, settings/
```

### How a player action flows

```
client/input → network command → server/net (validate with zod)
  → rules/<feature>/commands.ts → rules → world state + events
  → server/net → network messages + sync snapshots → client/views
```

## Import rules

```
shared/content  ←  shared/rules  ←  shared/network
                        ↑                 ↑
       server ──────────┴─────────────────┘   (+ socket.io, express, mongodb)
       client ──────────┴─────────────────┘   (+ phaser, react, ui)
       wiki   → shared/content, ui
```

- `shared/` never imports `server/`, `client/`, `wiki/` or `ui/`.
- `shared/content/` imports nothing else from the repo.
- `shared/rules/` imports only `shared/content/`. No Phaser, socket.io, mongodb, express or DOM.
- `shared/network/` may import `shared/rules/` types. `shared/rules/` never imports `shared/network/`.
- `server/`, `client/` and `wiki/` never import each other.
- Code outside a feature imports it only through its `index.ts`.

## Conventions

- **No grab-bag files.** No `utils`, `helpers`, `common`, `misc` or `lib` files or folders, and no `shared` folder other than `src/shared/`. Code lives where it's used. Truly generic code goes in a narrowly named module, such as `rules/world/geometry.ts`.
- **No `*Manager` classes.** That kind of logic becomes a feature's rules and systems.
- **Rules are pure.** `rules.ts` takes state and returns results or new state. Systems, command handlers, socket code and React components stay thin and call the rules.
- **One source of truth for types.** Network types are inferred from zod schemas. Content types come from the content definitions. Don't write the same shape twice.
- **Files stay under 400 lines.** Past that, split by responsibility.
- **TypeScript only, strict mode** for everything in `shared/` and for all new files.

## Naming

| Rule | Example |
|---|---|
| All files and folders are kebab-case, components and classes included | `item-tooltip.tsx`, `game-server.ts`, `rules/inventory/` |
| Named exports only, no default exports (except tool config files) | `export function moveItem` |
| Tests end in `.test.ts` / `.test.tsx`, never `.spec` | `rules.test.ts` |
| `.tsx` only for files that contain JSX | |
| `index.ts` only as a feature's or folder's public API: re-exports, no logic | |
| Feature files use the standard names (`index`, `rules`, `system`, `commands`). Larger features may add subfolders or other kebab-case files. | |

Kebab-case avoids a whole class of bugs: macOS ignores case in file names and Linux doesn't, so a case-only rename can work locally and break CI. Named exports keep one name per thing across every import.

Inside code:
- `PascalCase` for types, classes and components
- `camelCase` for functions, variables, event names and command names (`mobKilled`, `moveItem`)
- `SCREAMING_CASE` only for real constants at the top of a file

Exceptions: uppercase Markdown at the repo root (`README.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `TODO.md`) and tool config files.

## Tests

| Kind | Location |
|---|---|
| Unit tests | Next to the code, `foo.ts` → `foo.test.ts` |
| Game scenarios (build a world, run ticks, check the result) | `src/shared/rules/tests/` |
| Socket and database integration | `src/server/tests/` |
| UI components | Next to the component, `Foo.tsx` → `Foo.test.tsx` |

## Enforcement

Everything runs in `npm run check`, which husky runs before each commit and CI runs on every pull request.

- **oxlint** enforces the import rules (`no-restricted-imports` with per-folder overrides), the 400-line limit (`max-lines`), kebab-case file names (`unicorn/filename-case`) and named exports (`import/no-default-export`).
- **`scripts/check-structure.ts`** rejects banned and non-kebab-case folder names, `*Manager` classes, `.spec` files, `.tsx` files without JSX and `index.ts` files containing logic.
- **`tsconfig.strict.json`** typechecks `src/shared/` in strict mode.
- **Legacy exceptions** are listed in one place in each config (the oxlint `overrides` block and the script's allowlist). They may only shrink.
- **`CLAUDE.md`** at the root, plus one in each of `src/shared/rules/`, `src/shared/network/` and `src/shared/content/`, gives agents the rules for the folder they're working in.
