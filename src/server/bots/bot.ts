import { io as connect } from "socket.io-client";
import {
  encodeWireDirection,
  type ChatMessage,
  type ClientGameSocket,
  type ClientToServerEvents,
  type FullCharacterWire,
  type ServerToClientEvents,
} from "@/network";
import { createRoomView } from "./room-view";

/** How often a walking bot reports its position, like a client on a 20 fps network tick. */
const STEP_MS = 50;
/** Bots walk a little under their speed so the server's speed check never trips on timing. */
const SPEED_MARGIN = 0.85;
/** How close counts as having arrived, in pixels. */
const ARRIVE_DISTANCE = 4;
/** Melee reach a fighting bot keeps from its target. */
const FIGHT_DISTANCE = 20;

type EventName = keyof ServerToClientEvents;
type Payload<E extends EventName> = Parameters<ServerToClientEvents[E]>[0];
/** socket.io's typed `on` can't take a generic event name; the bot's helpers keep the types. */
type LooseSocket = {
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  off: (event: string, listener: (...args: unknown[]) => void) => void;
  emit: (event: string, ...args: unknown[]) => void;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface BotOptions {
  url: string;
  name: string;
  charClass?: string;
}

/**
 * A scripted player. It connects and logs in exactly like the browser (demo login), so the server
 * treats it as a real player and anyone in the room sees it. It knows only what the server tells it.
 */
export class Bot {
  readonly name: string;
  readonly socket: ClientGameSocket;
  readonly room = createRoomView();
  x = 0;
  y = 0;
  roomName = "";
  walkSpeed = 100;
  /** The bot's own character, as the server last sent it. */
  hero?: FullCharacterWire;
  /** Every `positionCorrection` the server sent: a move it refused. */
  readonly corrections: { x: number; y: number }[] = [];
  readonly messages: ChatMessage[] = [];
  /** Experience the server has awarded this bot since it joined. */
  expGained = 0;

  private constructor(name: string, socket: ClientGameSocket) {
    this.name = name;
    this.socket = socket;
    this.listen();
  }

  /** Connects, logs in and renames itself. Needs a server with cheats on. */
  static async join({ url, name, charClass = "warrior" }: BotOptions): Promise<Bot> {
    const socket: ClientGameSocket = connect(url, { transports: ["websocket"], forceNew: true });
    const bot = new Bot(name, socket);
    await bot.waitFor("connect" as EventName);
    const entered = bot.waitFor("heroInit");
    socket.emit("demoLogin", { charClass });
    await entered;
    const renamed = await bot.cheat(`/name ${name}`);
    if (renamed.type === "error") {
      throw new Error(`${name} can't use cheats: is the server running with ENABLE_CHEATS=true?`);
    }
    return bot;
  }

  get id() {
    return this.socket.id as string;
  }

  /** Resolves with the next `event` whose payload matches. */
  waitFor<E extends EventName>(
    event: E,
    matches: (payload: Payload<E>) => boolean = () => true,
    timeoutMs = 5000,
  ): Promise<Payload<E>> {
    const socket = this.socket as unknown as LooseSocket;
    return new Promise((resolve, reject) => {
      const listener = (...args: unknown[]) => {
        if (!matches(args[0] as Payload<E>)) return;
        clearTimeout(timer);
        socket.off(event, listener);
        resolve(args[0] as Payload<E>);
      };
      const timer = setTimeout(() => {
        socket.off(event, listener);
        reject(new Error(`${this.name} timed out waiting for "${event}"`));
      }, timeoutMs);
      socket.on(event, listener);
    });
  }

  /** Sends a command the bot's helpers don't cover. */
  send<E extends keyof ClientToServerEvents>(event: E, ...args: unknown[]) {
    (this.socket as unknown as LooseSocket).emit(event, ...args);
  }

  /** Resolves once the server has handled everything this bot sent before it. */
  sync(): Promise<void> {
    return new Promise((resolve) => this.socket.emit("latency", () => resolve()));
  }

  /** Runs a `/cheat` and resolves with its status line. */
  async cheat(command: string): Promise<ChatMessage> {
    const reply = this.waitFor("message", (m) => !!m && m.type !== "chat");
    this.socket.emit("message", { message: command });
    return (await reply) as ChatMessage;
  }

  say(message: string) {
    this.socket.emit("message", { message });
  }

  /**
   * Walks in a straight line at walking speed, reporting each step like a client. Stops early when
   * the server corrects it (a wall, the map edge). Resolves with whether it got there.
   */
  async walkTo(x: number, y: number, timeoutMs = 15000): Promise<boolean> {
    const correctionsBefore = this.corrections.length;
    const step = (this.walkSpeed * SPEED_MARGIN * STEP_MS) / 1000;
    const deadline = performance.now() + timeoutMs;
    while (performance.now() < deadline) {
      const dx = x - this.x;
      const dy = y - this.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= ARRIVE_DISTANCE) break;
      if (this.corrections.length > correctionsBefore) return false;
      const move = Math.min(step, distance);
      this.x += (dx / distance) * move;
      this.y += (dy / distance) * move;
      this.socket.emit("playerInput", {
        x: this.x,
        y: this.y,
        vx: (dx / distance) * this.walkSpeed,
        vy: (dy / distance) * this.walkSpeed,
        d: encodeWireDirection(facing(dx, dy)),
        roomName: this.roomName,
      });
      await sleep(STEP_MS);
    }
    this.stop();
    await sleep(STEP_MS);
    return (
      this.corrections.length === correctionsBefore &&
      Math.hypot(x - this.x, y - this.y) <= ARRIVE_DISTANCE
    );
  }

  /** Stands still. */
  stop() {
    this.socket.emit("playerInput", { x: this.x, y: this.y, vx: 0, vy: 0 });
  }

  /** Swings once toward a point. */
  attackToward(x: number, y: number) {
    const angle = Math.atan2(y - this.y, x - this.x);
    this.socket.emit("attack", {
      count: 1,
      direction: facing(x - this.x, y - this.y),
      castAngle: angle,
    });
  }

  /** Chases an NPC and swings at it until it dies. Resolves with whether it died in time. */
  async fight(npcId: string, timeoutMs = 20000): Promise<boolean> {
    const deadline = performance.now() + timeoutMs;
    while (performance.now() < deadline) {
      const target = this.room.characters.get(npcId);
      if (!target || target.isDead) return !!target;
      if (Math.hypot(target.x - this.x, target.y - this.y) > FIGHT_DISTANCE) {
        await this.cheat(
          `/tp ${Math.round(target.x)} ${Math.round(target.y - FIGHT_DISTANCE / 2)}`,
        );
      }
      this.attackToward(target.x, target.y);
      await sleep(150);
    }
    return false;
  }

  /** Invites another bot and has it accept. Resolves with the party id. */
  async inviteToParty(other: Bot): Promise<string> {
    const invite = other.waitFor("partyInvite");
    this.socket.emit("inviteToParty", other.id);
    const { partyId } = await invite;
    const joined = this.waitFor(
      "partyUpdate",
      (u) => !!u.party?.members.some((m) => m.id === other.id),
    );
    other.socket.emit("partyAccept", partyId);
    await joined;
    return partyId;
  }

  leave() {
    this.socket.disconnect();
  }

  private listen() {
    const s = this.socket;
    s.on("heroInit", (state) => {
      this.room.reset(state);
      const hero = state.players.find((p) => p.socketId === state.socketId);
      if (!hero) return;
      /* A teleport within the room keeps the room name, so always take the new spot */
      this.becomeHero(hero);
      this.x = hero.x;
      this.y = hero.y;
    });
    s.on("playerJoin", (player) => this.room.add(player, "player"));
    s.on("playerUpdate", (player) => {
      if (player.socketId === this.id) this.becomeHero(player);
    });
    s.on("remove", (socketId) => this.room.remove(socketId));
    s.on("npcJoin", (npc) => this.room.add(npc, "npc"));
    s.on("npcRemove", (id) => this.room.remove(id));
    s.on("respawnNpc", ({ id, x, y }) => this.room.markAlive(id, x, y));
    s.on("poses", (data) => this.room.applyPoses(data));
    s.on("positionCorrection", (position) => {
      this.corrections.push(position);
      this.x = position.x;
      this.y = position.y;
    });
    s.on("assignDamage", (hits) => {
      for (const hit of hits) {
        if (hit.type === "death" && hit.to) this.room.markDead(hit.to);
        if (hit.type === "exp" && hit.to === this.id) this.expGained += hit.amount ?? 0;
      }
    });
    s.on("message", (message) => {
      if (message) this.messages.push(message);
    });
  }

  private becomeHero(hero: FullCharacterWire) {
    /* playerUpdate repeats the last accepted spot, which can trail a walking bot */
    if (this.roomName !== hero.roomName || !this.hero) {
      this.x = hero.x;
      this.y = hero.y;
    }
    this.hero = hero;
    this.roomName = hero.roomName;
    this.walkSpeed = hero.stats?.walkSpeed ?? this.walkSpeed;
  }
}

/** The four-way facing the game uses for a movement or aim vector. */
function facing(dx: number, dy: number) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}
