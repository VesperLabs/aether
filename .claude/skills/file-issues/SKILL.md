---
name: file-issues
description: Audit the codebase for things to improve and file each one as a GitHub issue with a type, label and priority. Use when the user asks to find improvements, audit the code, or turn TODOs and problems into issues.
---

# File issues

Find real problems, then file one issue per problem. Quality over count: skip anything you can't point to in the code.

## 1. Look

Check existing issues first (`gh issue list --state all --limit 100`) and don't file duplicates. Then sweep, roughly in priority order:

- **Server authority gaps**: anything the client decides that the server should (cooldowns, hits, positions, costs). Compare client input code with the matching handler in `src/server/net/handlers/` and the rule in `src/rules/`.
- **`TODO`/`FIXME`/`HACK`** comments, `@ts-expect-error`, `oxlint-disable`: `grep -rn "TODO\|FIXME\|HACK\|ts-expect-error\|oxlint-disable" src scripts`
- **Gates**: steps in `npm run check` missing from `.github/workflows/`.
- **Legacy code** still in `src/server` (see `src/rules/CLAUDE.md`), files near the 400-line cap, source files without tests.
- **Bandwidth**: full state sent where a delta would do, per-frame emits.

Read the code around each hit before filing; confirm the problem is real (e.g. the server really doesn't check the cooldown).

## 2. Classify

Every issue gets exactly one **type**, one **area label** and one **priority label**.

| Type      | Use for                                   | Area label (pick one)                          |
| --------- | ----------------------------------------- | ---------------------------------------------- |
| `Bug`     | wrong behavior, exploits                  | `bug`                                          |
| `Feature` | new behavior or a real improvement        | `enhancement`, `performance`                   |
| `Task`    | refactors, migration, CI, cleanup, docs   | `tech-debt`, `chore`, `documentation`          |

| Priority           | Meaning                                       |
| ------------------ | --------------------------------------------- |
| `priority: high`   | exploits, broken play, data loss, missing CI gates |
| `priority: medium` | real cost now: bandwidth, design debt blocking work |
| `priority: low`    | cleanup, stale TODOs, nice-to-haves           |

## 3. Write

Title: a conventional-commit title, the one the fixing PR would use (`fix: enforce potion cooldowns on the server`).

Body, exactly these sections:

```markdown
## Problem

What is wrong and why it matters, in two or three sentences. Quote the TODO if there is one.

## Where

- [`src/server/net/handlers/inventory.ts#L88-L101`](https://github.com/VesperLabs/aether/blob/<sha>/src/server/net/handlers/inventory.ts#L88-L101): `consumeItem` sets `lastPotion` but never checks it

## Tasks

- [ ] Concrete step one
- [ ] Concrete step two
- [ ] Test: what the test asserts and where it lives

## Related

- #140
```

- Links are permalinks to the current `origin/main` commit (`git rev-parse origin/main`), never relative paths; relative links don't resolve in issues.
- Tasks are a GitHub task list (`- [ ]`), one checkable step each, ending with the test.
- Drop `## Related` when there is nothing related. Use `#N` so GitHub cross-links.

## 4. File

Write each body to a file in the scratchpad, then:

```sh
url=$(gh issue create --title "$TITLE" --label "$AREA" --label "$PRIORITY" --body-file "$BODY")
gh api -X PATCH "repos/VesperLabs/aether/issues/${url##*/}" -f type="$TYPE" >/dev/null
```

The priority and area labels are listed in the tables above; create a missing one with `gh label create`. Valid types come from `gh api orgs/VesperLabs/issue-types`.

## 5. Report

List the issues highest priority first, one line each: link, type, priority, and what's wrong. Offer to hand the high-priority ones to `worker` agents.
