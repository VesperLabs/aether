import type { ChatMessage } from "@/network";
import type { Point } from "@/rules/world";
import { createAtlas, type Atlas, type KnownRoom, type MapSource } from "./atlas";
import type { BotBody } from "./body";
import { createWeapon, type FightOutcome } from "./combat";
import type { BotLink, Clock, MessageName, MessagePayload } from "./link";
import { sendPosition, travelTo, walkTo, type TravelOptions } from "./movement";
import { inviteToParty, type PartyMember } from "./party";
import { createSenses, type Senses } from "./senses";

export type { FightOutcome } from "./combat";

export interface BotOptions {
  name: string;
  charClass?: string;
  clock: Clock;
  /** Where the bot reads room maps, to find its way around walls and to doors. */
  maps: MapSource;
  /** Whether this bot may use `/cheats`. Test hosts grant it; bots living in the world don't. */
  cheats?: boolean;
}

/**
 * A player driven by code. It logs in and acts through the same commands as the browser and knows
 * only what the server tells it (its `senses`), so the server can't tell it from a person.
 */
export class Bot {
  readonly name: string;
  readonly senses: Senses;
  private readonly link: BotLink;
  private readonly clock: Clock;
  private readonly cheats: boolean;
  private readonly stopListening: (() => void)[] = [];
  private readonly body: BotBody;
  private readonly weapon: ReturnType<typeof createWeapon>;
  private readonly atlas: Atlas;

  private constructor(link: BotLink, { name, clock, maps, cheats = false }: BotOptions) {
    this.name = name;
    this.atlas = createAtlas(maps);
    this.link = link;
    this.clock = clock;
    this.cheats = cheats;
    const { senses, handlers } = createSenses();
    this.senses = senses;
    this.body = { name, link, clock, senses, sync: () => this.sync() };
    this.weapon = createWeapon(this.body);
    for (const [message, handler] of Object.entries(handlers)) {
      this.stopListening.push(link.on(message as MessageName, handler as (p: unknown) => void));
    }
  }

  /** Logs in on a connected link as a demo character named `name`. */
  static async join(link: BotLink, options: BotOptions): Promise<Bot> {
    const bot = new Bot(link, options);
    const entered = bot.waitFor("heroInit");
    link.send("demoLogin", { charClass: options.charClass ?? "warrior" });
    await entered;
    if (bot.cheats) {
      const renamed = await bot.cheat(`/name ${options.name}`);
      if (renamed.type === "error") {
        throw new Error(`${options.name} can't use cheats: is ENABLE_CHEATS=true on the server?`);
      }
    } else {
      /* The same rename a player does from the character screen */
      link.send("updateProfile", { userName: options.name });
      await bot.sync();
    }
    return bot;
  }

  get id() {
    return this.link.id;
  }

  /** The room the bot stands in, as its map describes it: walls and doors. */
  get room(): KnownRoom {
    return this.atlas(this.senses.roomName);
  }

  /** Listens for a message from the server; returns a function that stops listening. */
  on<M extends MessageName>(message: M, listener: (payload: MessagePayload<M>) => void) {
    return this.link.on(message, listener);
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

  /** Resolves once the server has handled everything this bot sent before it. */
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
  walkTo(x: number, y: number, timeoutMs = 15000): Promise<boolean> {
    return walkTo(this.body, x, y, { timeoutMs });
  }

  /**
   * Walks around walls (and, if asked, mobs) to a spot in this room, at a pace from 0 to 1.
   * Resolves with whether it got there.
   */
  travelTo(to: Point, options: TravelOptions = {}): Promise<boolean> {
    return travelTo(this.body, this.room, to, options);
  }

  /**
   * Steps through a door it stands next to. Resolves with whether it came out in the room beyond;
   * the server ignores a door that is too far away.
   */
  enterDoor(doorName: string): Promise<boolean> {
    const arrived = this.waitFor("heroInit");
    this.link.send("enterDoor", doorName);
    return arrived.then(
      () => true,
      () => false,
    );
  }

  /** Stands still. */
  stop() {
    sendPosition(this.body, this.senses.x, this.senses.y);
  }

  /** How long until the bot's weapon is ready to swing again, like the browser's cooldown. */
  swingCooldown(): number {
    return this.weapon.cooldown();
  }

  /** Swings once toward a point, as soon as the weapon is ready. */
  attackToward(x: number, y: number) {
    return this.weapon.attackToward(x, y);
  }

  /** Swings right now, ready or not, to probe the server's attack pacing. */
  swingAt(x: number, y: number) {
    this.weapon.swingAt(x, y);
  }

  /**
   * Fights an NPC, swinging as fast as the weapon allows and closing in when it moves away. Walks
   * in, or with cheats teleports, which keeps tests short. Resolves with how it ended.
   */
  fight(npcId: string, timeoutMs = 20000): Promise<FightOutcome> {
    return this.weapon.fight(npcId, timeoutMs, (x, y) => this.approach(x, y));
  }

  /** Comes back to life at the spawn point, as the browser's respawn button does. */
  async respawn() {
    const back = this.waitFor("heroInit");
    this.link.send("respawn");
    await back;
  }

  /** Invites another bot and has it accept. Resolves with the party id. */
  inviteToParty(other: Bot): Promise<string> {
    return inviteToParty(this.member(), other.member());
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
    sendPosition(this.body, x, y);
  }

  leave() {
    this.stopListening.forEach((stop) => stop());
    this.link.close();
  }

  private async approach(x: number, y: number) {
    if (this.cheats) await this.cheat(`/tp ${Math.round(x)} ${Math.round(y)}`);
    else await this.walkTo(x, y, 2000);
  }

  private member(): PartyMember {
    return { id: this.id, link: this.link, waitFor: (m, matches) => this.waitFor(m, matches) };
  }
}
