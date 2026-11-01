# Aether

Server-authoritative online game: Phaser + React client, Node + socket.io server, MongoDB.

@ARCHITECTURE.md

## Working here

- One branch per task. Before editing files for a new task, run `git fetch origin`, then branch from the fresh `origin/main` (kebab-case, named after the task), never from a local or stale branch. Ship it with `/ship`.
  - Only one task running: if the main checkout is on `main` with no uncommitted changes, branch there, so the user can preview it in the browser with `npm run dev`.
  - Another task already running: if the main checkout is on another branch or has uncommitted changes, enter a worktree instead, so the tasks never share files. Parallel agents always use worktrees.
- Don't add to existing `utils`/`helpers`/`common` files. If you touch a function in one, move it to its proper home.
- Move code in small steps that keep `npm run check` passing.
- Commits and PR titles are [conventional commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `ci:`, `chore:`), enforced by commitlint; release-please bumps versions from them.

## Subagents

The main session runs on Opus. When delegating, use the `worker` agent (or `Explore` for read-only searching) and pick its `model` per task:

- `haiku`: searching, reading and summarizing; mechanical edits with an exact spec (renames, moving a file and fixing imports)
- `sonnet`: the default for scoped code work: refactors following an established pattern, gates, docs, tests, small fixes
- `opus`: design work, cross-cutting refactors, tricky bugs, security-sensitive code (exploits, auth), or a retry after a Sonnet attempt fell short

## Commands

- `npm run dev`: server, client and wiki together
- `npm run check`: format, lint, typecheck, tests, structure. Must pass before committing.
- `npm test`: tests only
- `npm run format` / `npx oxfmt <files>`: this repo uses **oxfmt**. Never run `prettier`; its output fails `check:format`.
