---
name: ship
description: Ship the current work as a PR that auto-merges into main when CI passes. Use when the user says ship, send it, open a PR, or is done with a task.
---

# Ship

Take the current work from uncommitted changes to an auto-merging PR. Stop and report if any step fails and you can't fix it.

1. **Branch.** If on `main`, create a branch named `<type>/<short-kebab-topic>` (e.g. `fix/loot-roll`). Worktree sessions are already on their own branch.
2. **Check.** Run `npm run check`. Fix any failures (run `npm run format` for formatting, never prettier).
3. **Commit.** Stage only the files for this task and commit with a conventional message (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `ci:`, `chore:`). Don't commit `.env` or secrets.
4. **Sync.** Run `git fetch origin && git rebase origin/main`. Resolve conflicts by keeping both sides' intent; read both versions, don't just pick one. Re-run `npm run check` if the rebase changed anything.
5. **Push.** `git push -u origin HEAD` (use `--force-with-lease` after a rebase of an already-pushed branch).
6. **PR.** If no PR exists for the branch, run `gh pr create --fill --base main`. The PR title becomes the squash commit on main, so it must be a conventional commit; fix it with `gh pr edit --title` if needed.
7. **Auto-merge.** `gh pr merge --auto --squash --delete-branch`.
8. **Report.** Give the PR URL in one line. CI merges it; you don't need to wait.

If the user says "ship and wait", watch with `gh pr checks --watch`. If checks fail, fix the cause, push again, and repeat.
