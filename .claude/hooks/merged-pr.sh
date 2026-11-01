#!/bin/sh
# UserPromptSubmit hook: warn the session when its branch's PR was merged on GitHub,
# so it starts the next task from fresh main instead of building on a merged branch.
branch=$(git branch --show-current 2>/dev/null)
[ -z "$branch" ] || [ "$branch" = main ] && exit 0
state=$(gh pr view "$branch" --json state -q .state 2>/dev/null)
[ "$state" = MERGED ] || exit 0
echo "The PR for branch $branch has already been merged on GitHub. Don't add more work to this branch. Switch to main (if you're in its worktree, leave and remove it), then start the next task on a new branch from a freshly fetched origin/main."
