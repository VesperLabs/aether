# Working on bots

Bots are players driven by code, so every rough edge they hit is one a player or the client hits too. Working on bots is a chance to fix the game, not to work around it.

- **Fix the game, don't work around it.** When a bot needs a hack (a retry, a sleep, a magic offset, a duplicated rule), find the cause in `rules/`, `network/` or `server/` and fix it there. Then the client and every bot benefit.
- **Just do refactors that help.** If a refactor makes the real codebase faster, cleaner or easier to read, or gives bots a nicer API, do it as part of the task. Don't ask first. Keep `npm run check` passing at each step.
- **Share rules, never copy them.** Bots import the game's own rules (pathfinding, door range, swing reach, speed) from `@/rules`. If a rule is stuck inside `server/` or `client/`, move it into `rules/` so both can use it.
- **Lean on the network contract.** If a bot can't learn something from server messages, a player's client probably infers it awkwardly too. Fix the message (`network/messages.ts`, `sync/`) instead of guessing.
- **A bot bug can be a server bug.** When a bot gets corrected, stuck or desynced, assume the server may be wrong before blaming the bot. Write a scenario that shows it.
- **Start small, grow by need.** One brain, one behavior at a time. Add an action to `Bot` only when a brain or scenario uses it, and delete what nothing uses.
- **Pretty API, thin body.** Brains read like plain intent (`bot.travelTo(doorstep)`, `bot.enterDoor(name)`). The mechanics live in small modules under `bots/` or, if the game needs them too, in `rules/`.
