import { BOT_NAMES, CHAR_CLASSES, type BotPersonalityId, type CharClass } from "@/content";
import { createBotMemory } from "@/rules/bots";
import { createRng, seedFromString, type Rng } from "@/rules/world";
import { broadcastPlayerJoin } from "@/server/net/room-broadcast";
import { legacyLeaveParty } from "@/server/party-adapter";
import { createBaseUser } from "@/server/persistence/base-user";
import type { Player } from "@/server/player";
import { createPlayer } from "@/server/player-room";
import { removePlayer } from "@/server/remove-player";
import type { ServerWorld } from "@/server/server-world";
import { botActor } from "./bot-actor";

/** Where a bot appears, how it behaves, and optionally the character it plays. */
export interface BotSpawn {
  roomName: string;
  x: number;
  y: number;
  personality: BotPersonalityId;
  /** Unset picks one at random. */
  charClass?: CharClass;
  /** Unset picks one at random. */
  name?: string;
}

const pick = <T>(list: readonly T[], rng: Rng): T => list[Math.floor(rng() * list.length)] as T;

/** Creates a bot's character and shows it to the room, like a player logging in. */
export function spawnBot(world: ServerWorld, spawn: BotSpawn): Player | undefined {
  if (!world.rooms[spawn.roomName]) return;
  const id = `bot-${world.dice.newId()}`;
  const rng = createRng(seedFromString(id));
  const user = createBaseUser(world.dice, spawn.charClass ?? pick(CHAR_CLASSES, rng));
  /* Bots are demo characters, so nothing about them is ever saved. */
  const player = createPlayer(world, spawn.roomName, {
    ...user,
    socketId: id,
    peerId: null,
    isDemoAccount: true,
    x: spawn.x,
    y: spawn.y,
    profile: { ...user.profile, userName: spawn.name ?? pick(BOT_NAMES, rng) },
  });

  world.bots[id] = {
    id,
    personality: spawn.personality,
    memory: createBotMemory(world.now(), rng),
    rng,
    isPaused: false,
    home: { x: spawn.x, y: spawn.y },
    walk: null,
    ctx: {
      world,
      io: world.io,
      actor: botActor(world),
      socketId: id,
      session: { peerId: null, address: "bot" },
    },
  };
  broadcastPlayerJoin(world, spawn.roomName, player, { isLogin: true });
  return player;
}

/** Takes a bot out of the game, like a player disconnecting. */
export function despawnBot(world: ServerWorld, id: string) {
  if (!world.bots[id]) return;
  legacyLeaveParty(world, id);
  removePlayer(world, id);
  delete world.bots[id];
  world.io.emit("remove", id);
}
