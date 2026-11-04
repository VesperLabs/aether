---
name: merge
description: Merge a reviewed PR, then sync the main checkout to the latest main for the next feature. Use when the user says merge, merge it, or land it after a ship.
---

# Merge

Only merge when the user asks. Stop and report if any step fails and you can't fix it.

1. **Find the PR.** Use the number the user gave, or the PR most recently shipped in this session. If it's unclear which one they mean, ask.
2. **Check.** Run `gh pr checks <number>`. If checks are failing, stop and report them. If they're still running, wait with `gh pr checks <number> --watch`.
3. **Merge.** Run `gh pr merge <number> --squash`.
4. **Sync.** In the main checkout, run `git checkout main && git pull`, so the next feature starts from the latest main. If the checkout has uncommitted changes, leave them alone and report it. In a worktree, sync the main checkout from its own path, then leave the worktree and remove it.
5. **Clean up.** Delete the local branch with `git branch -D` if it still exists.
6. **Report.** Say which PR merged and the commit `main` is now on.
