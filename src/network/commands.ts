import { z } from "zod";

/*
 * Everything a client may send to the server. One zod schema per command; the types come from the
 * schemas. The server drops a payload that does not match (see server/net/dispatcher.ts).
 *
 * The schemas are as permissive as the server code behind them: fields that the server tolerates
 * missing are optional, so no message the client sends today is rejected.
 */

const slotKey = z.union([z.number(), z.string()]);
const text = z.string().nullish();
const amount = z.union([z.number(), z.string()]).nullish();

/** The item a client points at. Only the id is trusted; the server looks the item up itself. */
const itemRef = z.looseObject({
  id: z.string().nullish(),
  base: z.string().nullish(),
  items: z.array(z.unknown()).nullish(),
});

/** One end of an inventory move. */
const itemSlot = z.looseObject({
  location: z.string().nullish(),
  slot: slotKey.nullish(),
  bagId: z.string().nullish(),
  amount,
});

const spellSlot = z.union([z.number(), z.string()]).nullish();

const profileStep = z.number().optional();

export const commands = {
  /* Auth */
  demoLogin: z.object({ charClass: z.string().nullish() }).optional(),
  login: z.object({ email: text, password: text }).optional(),
  register: z.object({ email: text, password: text, charClass: text }).optional(),
  /** The payload is an acknowledgement callback, which the server calls right away. */
  latency: z.custom<() => void>((value) => typeof value === "function"),

  /* Combat */
  attack: z
    .object({
      count: z.number().nullish(),
      direction: text,
      castAngle: z.number().nullish(),
      abilitySlot: spellSlot,
    })
    .optional(),
  castSpell: z.object({ abilitySlot: spellSlot, castAngle: z.number().nullish() }).optional(),
  /** Roll along `angle` (radians). */
  dodge: z.object({ angle: z.number() }),

  /* Movement and state */
  playerInput: z.object({
    x: z.number(),
    y: z.number(),
    vx: z.number(),
    vy: z.number(),
    /** Direction packed as a number, see `network/sync/net-wire.ts`. */
    d: z.number().optional(),
    direction: z.string().optional(),
    roomName: z.string().optional(),
  }),
  changeDirection: z.object({
    direction: z.string().optional(),
    lastAngle: z.number().nullish(),
  }),
  updateState: z
    .object({ isAiming: z.boolean().optional(), isHoldingAttack: z.boolean().optional() })
    .strict(),
  enterDoor: z.string(),
  respawn: z.unknown(),
  /* The payload is ignored: the server uses the home of the keeper being talked to. */
  setSpawn: z.unknown(),

  /* Items */
  grabLoot: z
    .object({ lootId: z.string().optional(), direction: z.string().optional() })
    .optional(),
  dropItem: z
    .object({
      location: z.string().nullish(),
      bagId: z.string().nullish(),
      item: itemRef.nullish(),
      amount,
    })
    .optional(),
  moveItem: z.object({ to: itemSlot.nullish(), from: itemSlot.nullish() }).optional(),
  consumeItem: z.object({ location: z.string().nullish(), item: itemRef.nullish() }).optional(),

  /* Social */
  message: z.object({ message: z.string().nullish() }).optional(),
  chatNpc: z.object({ npcId: z.string().optional() }).optional(),
  acceptQuest: z.string(),
  completeQuest: z.string(),
  inviteToParty: z.string(),
  partyAccept: z.string(),
  partyLeave: z.unknown(),

  /* Profile and settings */
  updateProfile: z
    .object({
      userName: z.string().optional(),
      hair: z.object({ texture: profileStep, tint: profileStep }).optional(),
      face: z.object({ texture: profileStep }).optional(),
      whiskers: z.object({ texture: profileStep, tint: profileStep }).optional(),
      skin: z.object({ tint: profileStep }).optional(),
      body: profileStep,
    })
    .optional(),
  updateUserSetting: z.object({ name: z.string(), value: z.unknown() }),

  /* Video chat */
  peerInit: z.string(),
  peerConnect: z.object({ peerId: z.string(), socketId: z.string() }),
} as const;

export type CommandName = keyof typeof commands;

/** The payload of a command, as the client writes it. */
export type CommandPayload<K extends CommandName> = z.input<(typeof commands)[K]>;

/** The payload of a command after the server validated it. */
export type ParsedCommand<K extends CommandName> = z.output<(typeof commands)[K]>;

type CommandArgs<K extends CommandName> =
  undefined extends CommandPayload<K>
    ? [payload?: CommandPayload<K>]
    : [payload: CommandPayload<K>];

/** Socket.IO's map of client to server events: `socket.emit("moveItem", { ... })` is type checked. */
export type ClientToServerEvents = {
  [K in CommandName]: (...args: CommandArgs<K>) => void;
};

export type MoveItemCommand = ParsedCommand<"moveItem">;
export type DropItemCommand = ParsedCommand<"dropItem">;
export type MessageCommand = ParsedCommand<"message">;
