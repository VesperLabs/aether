---
name: ship
description: Ship the current work as a PR for the user to review and merge. Use when the user says ship, send it, open a PR, or is done with a task.
---

# Ship

Take the current work from uncommitted changes to an open PR. Never merge it; the user reviews and merges it themselves. Stop and report if any step fails and you can't fix it.

1. **Branch.** If on `main`, create a branch named `<type>/<short-kebab-topic>` (e.g. `fix/loot-roll`). Worktree sessions are already on their own branch.
2. **Check.** Run `npm run check`. Fix any failures (run `npm run format` for formatting, never prettier).
3. **Commit.** Stage only the files for this task and commit with a conventional message (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `ci:`, `chore:`). Don't commit `.env` or secrets.
4. **Sync.** Run `git fetch origin && git rebase origin/main`. Resolve conflicts by keeping both sides' intent; read both versions, don't just pick one. Re-run `npm run check` if the rebase changed anything.
5. **Push.** `git push -u origin HEAD` (use `--force-with-lease` after a rebase of an already-pushed branch).
6. **PR.** If no PR exists for the branch, run `gh pr create --fill --base main`. The PR title becomes the squash commit on main, so it must be a conventional commit; fix it with `gh pr edit --title` if needed.
7. **Clean up.** In the main checkout, `git checkout main && git pull`. In a worktree, leave it and remove it. Either way the branch is safe on the remote; delete the local one with `git branch -D`.
8. **Report.** End your reply with the PR as a clickable markdown link, e.g. `[PR #70: fix: loot roll](https://github.com/VesperLabs/aether/pull/70)`, so the user can open it.

If the user says "ship and wait", watch with `gh pr checks --watch` before cleaning up. If checks fail, fix the cause, push again, and repeat. If CI fails or the user asks for changes after cleanup, check out the remote branch again to fix it.
