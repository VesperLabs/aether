import { encodeWireDirection, type ChatMessage } from "@/network";
import type { AgentLink, Clock, MessageName, MessagePayload } from "./link";
import { createSenses, type Senses } from "./senses";

/** How often a walking agent reports its position, like a client on a 20 fps network tick. */
const STEP_MS = 50;
/** Agents walk a little under their speed so the server's speed check never trips on timing. */
const SPEED_MARGIN = 0.85;
/** How close counts as having arrived, in pixels. */
const ARRIVE_DISTANCE = 4;
/** Melee reach a fighting agent keeps from its target. */
const FIGHT_DISTANCE = 20;
const DEFAULT_WALK_SPEED = 100;

export interface AgentOptions {
  name: string;
  charClass?: string;
  clock: Clock;
  /** Whether this agent may use `/cheats`. Test hosts grant it; agents living in the world don't. */
  cheats?: boolean;
}

/**
 * A player driven by code. It logs in and acts through the same commands as the browser and knows
 * only what the server tells it (its `senses`), so the server can't tell it from a person.
 */
export class Agent {
  readonly name: string;
  readonly senses: Senses;
  private readonly link: AgentLink;
  private readonly clock: Clock;
  private readonly cheats: boolean;
  private readonly stopListening: (() => void)[] = [];

  private constructor(link: AgentLink, { name, clock, cheats = false }: AgentOptions) {
    this.name = name;
    this.link = link;
    this.clock = clock;
    this.cheats = cheats;
    const { senses, handlers } = createSenses();
    this.senses = senses;
    for (const [message, handler] of Object.entries(handlers)) {
      this.stopListening.push(link.on(message as MessageName, handler as (p: unknown) => void));
    }
  }

  /** Logs in on a connected link as a demo character named `name`. */
  static async join(link: AgentLink, options: AgentOptions): Promise<Agent> {
    const agent = new Agent(link, options);
    const entered = agent.waitFor("heroInit");
    link.send("demoLogin", { charClass: options.charClass ?? "warrior" });
    await entered;
    if (agent.cheats) {
      const renamed = await agent.cheat(`/name ${options.name}`);
      if (renamed.type === "error") {
        throw new Error(`${options.name} can't use cheats: is ENABLE_CHEATS=true on the server?`);
      }
    } else {
      /* The same rename a player does from the character screen */
      link.send("updateProfile", { userName: options.name });
      await agent.sync();
    }
    return agent;
  }

  get id() {
    return this.link.id;
  }

  /** Resolves with the next `message` whose payload matches. */
  waitFor<M extends MessageName>(
    message: M,
    matches: (payload: MessagePayload<M>) => boolean = () => true,
    timeoutMs = 5000,
  ): Promise<MessagePayload<M>> {
    let stop = () => {};
    const arrived = new Promise<MessagePayload<M>>((resolve) => {
      stop = this.link.on(message, (payload) => {
        if (matches(payload)) resolve(payload);
      });
    });
    const timedOut = this.clock.sleep(timeoutMs).then(() => {
      throw new Error(`${this.name} timed out waiting for "${message}"`);
    });
    return Promise.race([arrived, timedOut]).finally(stop);
  }

  /** Resolves once the server has handled everything this agent sent before it. */
  sync(): Promise<void> {
    return new Promise((resolve) => this.link.send("latency", () => resolve()));
  }

  /** Runs a `/cheat` and resolves with its status line. */
  async cheat(command: string): Promise<ChatMessage> {
    if (!this.cheats) throw new Error(`${this.name} isn't allowed to cheat`);
    const reply = this.waitFor("message", (m) => !!m && m.type !== "chat");
    this.link.send("message", { message: command });
    return (await reply) as ChatMessage;
  }

  say(message: string) {
    this.link.send("message", { message });
  }

  /**
   * Walks in a straight line at walking speed, reporting each step like a client. Stops early when
   * the server corrects it (a wall, the map edge). Resolves with whether it got there.
   */
  async walkTo(x: number, y: number, timeoutMs = 15000): Promise<boolean> {
    const { senses } = this;
    const correctionsBefore = senses.corrections.length;
    const corrected = () => senses.corrections.length > correctionsBefore;
    const speed = senses.hero?.stats?.walkSpeed ?? DEFAULT_WALK_SPEED;
    const step = (speed * SPEED_MARGIN * STEP_MS) / 1000;
    const deadline = this.clock.now() + timeoutMs;
    while (this.clock.now() < deadline && !corrected()) {
      const dx = x - senses.x;
      const dy = y - senses.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= ARRIVE_DISTANCE) break;
      const move = Math.min(step, distance);
      senses.x += (dx / distance) * move;
      senses.y += (dy / distance) * move;
      this.link.send("playerInput", {
        x: senses.x,
        y: senses.y,
        vx: (dx / distance) * speed,
        vy: (dy / distance) * speed,
        d: encodeWireDirection(facing(dx, dy)),
        roomName: senses.roomName,
      });
      await this.clock.sleep(STEP_MS);
    }
    this.stop();
    await this.sync();
    return !corrected() && Math.hypot(x - senses.x, y - senses.y) <= ARRIVE_DISTANCE;
  }

  /** Stands still. */
  stop() {
    this.link.send("playerInput", { x: this.senses.x, y: this.senses.y, vx: 0, vy: 0 });
  }

  /** Swings once toward a point. */
  attackToward(x: number, y: number) {
    const dx = x - this.senses.x;
    const dy = y - this.senses.y;
    this.link.send("attack", {
      count: 1,
      direction: facing(dx, dy),
      castAngle: Math.atan2(dy, dx),
    });
  }

  /**
   * Swings at an NPC until it dies, closing in when it moves away. Walks in, or with cheats
   * teleports, which is faster and keeps tests short. Resolves with whether it died in time.
   */
  async fight(npcId: string, timeoutMs = 20000): Promise<boolean> {
    const deadline = this.clock.now() + timeoutMs;
    while (this.clock.now() < deadline) {
      const target = this.senses.characters.get(npcId);
      if (!target || target.isDead) return !!target;
      const far = Math.hypot(target.x - this.senses.x, target.y - this.senses.y) > FIGHT_DISTANCE;
      if (far) await this.approach(target.x, target.y - FIGHT_DISTANCE / 2);
      this.attackToward(target.x, target.y);
      await this.clock.sleep(150);
    }
    return false;
  }

  /** Invites another agent and has it accept. Resolves with the party id. */
  async inviteToParty(other: Agent): Promise<string> {
    const invite = other.waitFor("partyInvite");
    this.link.send("inviteToParty", other.id);
    const { partyId } = await invite;
    const joined = this.waitFor(
      "partyUpdate",
      (u) => !!u.party?.members.some((m) => m.id === other.id),
    );
    other.link.send("partyAccept", partyId);
    await joined;
    return partyId;
  }

  leaveParty() {
    this.link.send("partyLeave");
  }

  /** Uses an item from the inventory, by id. */
  consume(itemId: string) {
    this.link.send("consumeItem", { item: { id: itemId }, location: "inventory" });
  }

  /** Sends a raw position, legal or not, to probe the server's movement checks. */
  sendPosition(x: number, y: number) {
    this.link.send("playerInput", { x, y, vx: 0, vy: 0 });
  }

  leave() {
    this.stopListening.forEach((stop) => stop());
    this.link.close();
  }

  private async approach(x: number, y: number) {
    if (this.cheats) await this.cheat(`/tp ${Math.round(x)} ${Math.round(y)}`);
    else await this.walkTo(x, y, 2000);
  }
}

/** The four-way facing the game uses for a movement or aim vector. */
function facing(dx: number, dy: number) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}
