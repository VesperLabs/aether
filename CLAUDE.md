# Aether

Server-authoritative online game: Phaser + React client, Node + socket.io server, MongoDB.

@ARCHITECTURE.md

## Working here

- One worktree per task. Before editing files for a new task, run `git fetch origin`, then enter a worktree named after it (kebab-case) branched from the fresh `origin/main`, never from a local or stale branch. Parallel sessions then never share files and always start from the latest main. Ship it with `/ship`.
- Don't add to existing `utils`/`helpers`/`common` files. If you touch a function in one, move it to its proper home.
- Move code in small steps that keep `npm run check` passing.
- Commits and PR titles are [conventional commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `ci:`, `chore:`), enforced by commitlint; release-please bumps versions from them.

## Commands

- `npm run dev`: server, client and wiki together
- `npm run check`: format, lint, typecheck, tests, structure. Must pass before committing.
- `npm test`: tests only
- `npm run format` / `npx oxfmt <files>`: this repo uses **oxfmt**. Never run `prettier`; its output fails `check:format`.
