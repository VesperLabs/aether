# Aether

Server-authoritative online game: Phaser + React client, Node + socket.io server, MongoDB.

@ARCHITECTURE.md

## Working here

- The repo is mid-migration. Old code may break the rules above; new code never does.
- Don't add to existing `utils`/`helpers`/`common` files. If you touch a function in one, move it to its proper home.
- New client→server messages: a zod schema in `src/network/commands.ts` plus a handler in the feature's `commands.ts`. Never add a raw `socket.on`.
- New game events go in `src/rules/events.ts`.
- Move code in small steps that keep `npm run check` passing.
- Commits and PR titles are [conventional commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `ci:`, `chore:`), enforced by commitlint; release-please bumps versions from them.

## Commands

- `npm run dev`: server, client and wiki together
- `npm run check`: format, lint, typecheck, tests, structure. Must pass before committing.
- `npm test`: tests only
- `npm run format` / `npx oxfmt <files>`: this repo uses **oxfmt**. Never run `prettier`; its output fails `check:format`.
