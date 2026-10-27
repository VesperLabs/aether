# Aether

Server-authoritative online game: Phaser + React client, Node + socket.io server, MongoDB.

**Read `ARCHITECTURE.md` before adding or moving code.** It defines the layout, import rules and conventions. The repo is mid-migration (see `TODO.md`): older code doesn't follow it yet, but all new code must.

## Where things go

Each `src/` folder is a layer, and imports only point down (apps → ui → core):

- Core, plain TypeScript with no React, DOM, engines or IO:
  - `src/content/`: items, mobs, spells, quests, maps
  - `src/rules/`: the game itself, one folder per feature
  - `src/network/`: messages between client and server
- `src/ui/`: React views of the core, used by client and wiki. Grouped by feature like `rules/`; generic widgets in `ui/kit/`
- `src/server/`, `src/client/`, `src/wiki/`: the three apps. They never import each other

## Rules

- Put code where it belongs, usually a feature in `src/rules/`. Never create `utils`, `helpers`, `common`, `misc` or `lib` files or folders, and don't add to existing ones. If you touch a function in one, move it to its proper home.
- Don't create `*Manager` classes.
- Game rules are pure functions with no I/O. Socket code, systems and React components stay thin and call the rules.
- Respect the import rules in `ARCHITECTURE.md`. Use `@/` imports (`@/rules/inventory`, `@/ui`) across folders; relative imports only inside a folder.
- New client→server messages are a zod schema in `src/network/commands.ts` plus a handler in the feature's `commands.ts`. Never add a raw `socket.on` handler.
- New game events go in `src/rules/events.ts`.
- Keep files under 400 lines. TypeScript only, strict.
- File and folder names are kebab-case (`item-tooltip.tsx`). Named exports only, no default exports. `.tsx` only for files with JSX. `index.ts` only re-exports.
- In code: `PascalCase` for types, classes and components; `camelCase` for functions, variables, events and commands; `SCREAMING_CASE` only for top-level constants.
- Unit tests go next to the code (`foo.test.ts`). Game scenario tests go in `src/rules/tests/`, integration tests in `src/server/tests/`.
- Move code in small steps that keep `npm run check` passing.
- Commit messages and PR titles are [conventional commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `ci:`, `chore:`), enforced by commitlint. release-please uses them to bump the version.

## Commands

- `npm run dev`: server, client and wiki together
- `npm run check`: format, lint, typecheck, tests and structure checks. Must pass before committing.
- `npm test`: tests only
- `npm run format` (or `npx oxfmt <files>`): format code. This repo uses **oxfmt**, not Prettier. Never run `prettier`; its output differs and fails `check:format`.
