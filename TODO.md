# TODO

Migration to the structure in `ARCHITECTURE.md`. Work through the phases in order. Keep `npm run check` passing after every step.

## Phase 1: Tooling and guardrails

- [x] Remove npm workspaces: one root `package.json` (move `wouter` from `web/`), delete the `client/`, `web/`, `ui/` and `shared/` package.json files, run the client and wiki Vite builds from root scripts with `--config`, and update the Dockerfile's manifest copies
- [x] Move the code folders under `src/`: `server/` → `src/server/`, `client/` → `src/client/`, `web/` → `src/wiki/`, `ui/` → `src/ui/`, `shared/` → `src/shared/` (contents get sorted in Phase 2). Update scripts, Vite configs, `build.server.js`, the Dockerfile, `PUBLIC_DIR` and the GitHub workflows.
- [x] Replace the `@aether/*` tsconfig paths with a single `"@/*": ["./src/*"]`. Enable it in the Vite configs (`resolve.tsconfigPaths`, or the `vite-tsconfig-paths` plugin if that setting isn't available) and confirm tsx, esbuild and Vitest resolve it.
- [x] Typecheck in strict mode (no `allowJs`); `tsconfig.json` is strict and covers the whole repo
- [x] Rename every file and folder to kebab-case as part of the move (use `git mv`, going through a temporary name for case-only renames so macOS picks them up)
- [x] Convert default exports to named exports and update the imports
- [x] oxlint: import rules from `ARCHITECTURE.md` via `no-restricted-imports` overrides, `max-lines` at 400, `unicorn/filename-case` (kebab-case) and `import/no-default-export` (off for tool config files), with existing violations listed in an overrides block. Confirm each rule exists in the installed oxlint version.
- [x] Add `scripts/check-structure.ts` and add it to `npm run check`. It rejects banned and non-kebab-case folder names, `*Manager` classes, `.spec` files, `.tsx` files without JSX and `index.ts` files containing logic, with an allowlist of existing violations.
- [x] Add `CLAUDE.md` files in `src/shared/rules/`, `src/shared/network/` and `src/shared/content/` as those folders are created

## Phase 2: Content and network

- [x] Create `src/shared/content/`: convert `shared/data/*.json` to typed TS definitions, and move `ItemBuilder`, `QuestBuilder` and maps there. Let the compiler check cross-references (quest → item, mob → loot).
- [x] Create `src/shared/network/`: move `netSnapshot`, `tickDelta`, `wireTick`, `netWire` and `tickState` into `network/sync/`
- [x] Write a zod schema in `network/commands.ts` for every client→server event in `GameServer.ts`, and types for every server→client message in `network/messages.ts`. Wire them into Socket.IO's typed server and client.
- [x] Replace the `socket.on` handlers with one generic dispatcher in `src/server/net/`
- [x] Split the rest of `GameServer.ts` into `src/server/auth/`, `admin/` (cheat commands, admin-only), `http/` (routes from `main.ts`) and `persistence/` (`server/db/`)
- [ ] Replace the wiki's duplicate `PlayerRender` and `Slot` with `src/ui/` (skipped: the wiki `PlayerRender` already wraps `ui`'s; the wiki `Slot` and tooltip differ visually from the client ones, see PR notes)

## Phase 3: Move rules into `src/shared/rules/`, one feature at a time

Do the pure ones first. Write tests as each one moves.

- [x] `rules/events.ts` and an event bus in `rules/world/`
- [x] `stats`: `calculateStats`, `calculateExpValue`, `calculateNextMaxExp` from `server/utils.ts`
      (Remaining legacy hooks: `assignExp` level-up on `server/character.ts`, `useGetBaseCharacterDefaults` in `server/utils.ts` for starting items and spawn.)
- [x] `inventory`: `moveItem`, `dropItem`, `consumeItem` from `GameServer.ts` and the inventory methods on `shared/Character.ts`
- [x] `loot` (`LootManager`), `party` (`PartyManager`), `quests` (quest methods on `Character`, `Quest.ts`)
- [x] `combat`, `spells`, `buffs` (methods on `shared/Character.ts`, `server/Character.ts`, `SpellManager`, `Spell.ts`)
- [x] `npc-behavior` (`server/Npc.ts`)
- [x] Move state packing (`get*RoomState`, `get*CharacterState`) into `network/sync/`
- [x] Route mob kills to loot, stats and quests through `mobKilled`

## Phase 4: Game core without Phaser on the server

- [x] `movement`: tilemap collision, box collision and movement math, easystar pathfinding (from `Room.ts`)
- [x] A `World` object in `rules/world/` replacing `ServerScene`, with a fixed-tick loop
- [x] Delete `server/Phaser.ts`, then remove `canvas`, `jsdom`, the `require` swap and the canvas build packages from the Dockerfile
- [x] Make game entities plain data. The server's `Character` no longer extends Phaser (shared `character-model.ts` mixin; the client class in `shared/character.ts` still mixes it into a Container). `rules/character/` is strict-clean. Remaining: server entities are still classes with methods that call the rules.
- [ ] Client: sprites to `src/client/views/` as displays of game state, input to `input/`, interpolation and prediction to `net/`, and run the rules on the client for movement prediction (files are moved and `utils.ts` is gone; sprites are still Phaser-driven state and there is no prediction yet)
- [x] Client: group `client/ui/` into `src/client/hud/<feature>/`
- [x] Remove any leftover loose files from `src/shared/` so it holds only `content/`, `rules/` and `network/`
- [x] Convert the remaining `.js` files to TypeScript (`allowJs` is off) and turn on strict mode repo-wide
- [x] Replace lodash with modern JS where possible

## Done when

- Every legacy exception list is empty
- Strict mode is on for the whole repo
- `src/shared/rules/tests/` has scenario tests covering combat, loot, inventory and quests

## Known bugs

Found during the migration and left alone so behaviour stayed identical. Fix after the migration, each with a test.

- [x] **Loot:** `grabLoot` has no range or ownership check, so any player can grab any loot by id from anywhere
- [x] **Quests:** if the inventory fills partway through the rewards, earlier reward items are kept but the quest isn't completed, so rewards can be farmed by retrying
- [x] **Quests:** turn-in subtracts quest items by key using functions that match by id, so items may not be consumed. Bags and abilities also need `amount > n`, so an exact amount isn't consumed.
- [x] **Quests:** accepting an unknown quest id pushes `{ questId: undefined }` onto the player's quests
- [x] **Quests:** `isReady` is `undefined` instead of `false` for unfinished quests
- [x] **Party:** inviting creates the inviter's party before validating the invitee, leaving a one-member party on a bad invite
- [x] **Party:** the duplicate-login kick passes the new socket, so the kicked player's party membership goes stale
- [x] **Party:** pending invites aren't cleaned up when the inviter leaves or the party disbands
- [x] **Party:** the leave message can read "undefined has left the party"
- [x] **Loot:** map-loot spawning throws if `buildItem` returns null for an unknown item
- [x] **Inventory:** selling credits gold even when no item was removed (quantity larger than the stack); bag and ability sells don't check the stack size at all
- [x] **Inventory:** the shop checks `item.slot === "stackable"` where it likely means `type`, so some bought stackables get a new id and never merge
- [x] **Inventory:** dropping on bag slot 0 counts as "dropped on the bag", and bags with an empty `items` array always answer "Bag is full"
- [x] **Inventory:** `findBagItemById` returns the last matching bag, but update and delete touch the first match in every bag
- [x] **Inventory:** consuming food with no `buffs` throws after the item was already removed
- [x] **Inventory:** `deleteAbilityAtId` with an unknown id writes `abilities["null"] = null`
- [x] **Inventory:** a move between unsupported slots (equipment ↔ abilities) still saves and emits `playerUpdate`
- [x] **Inventory:** buying a stackable that merges into an existing stack ignores a non-blank destination slot
- [x] **Buffs:** `expireBuffs` splices while iterating, so when two neighbouring buffs expire in the same tick only the first is removed
- [x] **Combat:** `modifyStat`'s undefined check can never be true (`parseInt` gives NaN), so a NaN stat stays NaN
- [x] **Combat:** `Player.doAttack` computes `spCost + stats?.spCost || 0`, which is NaN when `stats.spCost` is missing, so the SP cost is skipped
- [x] **Combat:** `calculateActiveItemSlots` throws for a buff with `percentStats` but no `stats`
- [x] **NPC behavior:** `Npc.isTargetSuitableForSpell` uses bare `Math.random()`, so it can't be seeded
- [x] **Types:** `global.d.ts` still has `TickCharacterState`, `TickRoomState`, `RoomState`, `BuffRoomState` and `BuffCharacterState`, now unused or wrong (`BuffRoomState` claims full character state; `TickRoomState` has a `spells` key that's never sent). Delete them.
- [x] **NPC behavior:** `checkTalking` removes entries from `talkingIds` while iterating, so the next entry is skipped that tick
- [x] **Combat:** `setLockedPlayerId(attacker.id)` stores the player `id`, but `Npc.update` looks the target up by socket id; this only works if the two are equal
- [x] **Client HUD:** `hud/app/app.tsx` registers its socket and window handlers once (`useEffect(..., [])`), so `onPartyInvite`, `onDropItem` and `onDoubleClickItem` read `partyInvites`, `hero` and `bagState` from the first render. Duplicate-invite checks, the dead-hero drop guard and closing an open bag on drop never see current state.
- [x] **Client HUD:** `onHeroChatNpc` returns from a `setTabKeeper` updater that emits `chatNpc` as a side effect, which React StrictMode runs twice in dev
- [ ] **Client:** `wiki/page-players.tsx` imports the player menus from `@/client`, which breaks "wiki never imports client". Move them (and `Slot`/`ItemTooltip`, which need the app context) into `src/ui/` or make them props-only. (Open: needs a decision between a context in `src/ui/` or props-only `Slot`/`ItemTooltip`/`Tooltip`.)
- [x] **Client audio:** `MainScene.changeMusic` duplicates `audio/music.ts` `changeMusic` (the scene copy adds the `ASSETS_URL` prefix, so the module version loads tracks from the wrong URL on a CDN). Keep one.
- [x] **Client:** `views/player.ts` is still `// @ts-nocheck`, and Phaser classes declare their fields as `declare x: any` after the JS→TS conversion. Type them properly once entities are plain data.
- [x] **Movement:** NPC wall collision uses the profile-scaled `bodySize` as the box; Phaser used a fixed radius of 8
- [x] **Movement:** `Npc.waitAtSpawn` and the NPC attack/cast windups use bare `setTimeout`/`sleep`, so they keep running after the world is stopped and can't be driven by a test tick
- [x] **Server:** `shouldPause` logs "Game empty. Pausing." once at boot even though nothing was running
- [ ] **Types:** `rules/character/character.ts` types `equipment`, `abilities` and `buffs` as `any` because server entities still use the global `Item` and `Buff` interfaces. Narrow them once those are replaced by content types. (`buffs` is now `ActiveBuff[]`; `equipment` and `abilities` remain: narrowing them breaks quest types, server `Item` callbacks, the ui player render and two client files.)
- [x] **Client:** `views/weapon-sprite.ts` calls `setTintFill(color)`, which Phaser 4 removed (it logs an error and does nothing), so the elemental weapon borders never get a colour. Use `setTint(color).setTintMode(Phaser.TintModes.FILL)`.
- [x] **Client:** `views/player-layers.ts` passes `player.bubbleMessage` to `Bubble`; that property doesn't exist (it is `player.state.bubbleMessage`), so the bubble starts empty.
- [x] **Client:** `input/hero-events.ts` `HERO_USE_ITEM` calls `updateSpellCooldown(hero, e.detail)` with the whole `{ item, location }` detail instead of an ability slot.
- [x] **Client:** `net/scene-socket.ts` handlers called `getPlayer`/`getNpc` results without checking for undefined, so a message for an unknown entity threw. Now guarded in some handlers (skip instead of throw).
- [x] **Client:** `scenes/boot-scene.ts` passes `start: ""` to `generateFrameNames` (typed as a number) and `repeat: false` was changed to `0`.
- [x] **Client:** the Phaser entities' `destroy(true)` calls pass an argument that the overridden `destroy()` ignores.

- [x] **Server:** `grabLoot` and `changeDirection` assign `direction` straight from the payload, so a missing direction sets `player.direction` to `undefined`
- [x] **Server:** `chatNpc` with an unknown `npcId` threw (now refuses); `enterDoor` with an unknown door name is fixed.
- [x] **Server:** `/keepers/all` and `/players/all` do arithmetic on the raw query strings (`startIndex + pageSize` concatenates), so pagination breaks when `page` and `pageSize` are passed
- [x] **Persistence:** `pruneItemByKey` passes an async callback to the cursor's `forEach`, which doesn't await it, so the updates are fire-and-forget
- [x] **Types:** a player that left its room (door, disconnect) holds `room = null` and `roomName = null`, but `CharacterModel` types both as always set; widen the model and fix the callers (see `detachFromRoom` in `server/player-room.ts`)
- [x] **Types:** plain attacks have no ability slot, so `Spell` calls `doHit(ids, undefined)`; `abilitySlot` is `number` in most signatures but a numeric string at runtime (`NpcAction`, object keys)
- [ ] **Types:** `CharacterState`, `CharacterArgs` and `NpcDefinition` in `src/server/` are `Record<string, any>` aliases for the untyped state bag, constructor args and content definitions. Replace them with real types, and the global `Item`, `Buff`, `Character`, `Quest` and `Loot` in `src/global.d.ts` with the content and rules types, once the client no longer uses them. (`CharacterState` is now a real interface in `rules/character/state.ts`, still with an `any` index signature; `CharacterArgs`, `NpcDefinition` and the globals remain.)
- [x] **Wiki:** `fetchPlayers` builds the URL from `limit`, which `PagePlayers` never sets, so the request is `...&limit=undefined`
- [x] **Client:** `StatusIcon` spread an undefined `props` onto its box (never passed any); removed. `menu-social` `Invite` emitted `inviteToParty` with an undefined `socketId` for a player without one; it now skips the emit.
- [x] **Types:** `client/input/joystick.ts` still casts `Phaser` to `any` for `Phaser.Class` (untyped in Phaser 4)
- [x] **Exploit:** `updateState` wrote any client key into `player.state` (now only `isAiming` / `isHoldingAttack`)
- [x] **Exploit:** `respawn` healed and teleported a living player
- [x] **Exploit:** `enterDoor` worked from anywhere in the room
- [x] **Exploit:** `playerInput` trusted client positions (speed hacks, walking through walls); now validated with a `positionCorrection` snap-back
- [x] **Exploit:** `chatNpc`, shop buy/sell and `setSpawn` worked from any distance, and `setSpawn` trusted client coordinates
