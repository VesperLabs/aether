import type { ServerToClientEvents } from "@/network/messages";
import type { ClientGameSocket } from "@/network/socket/game-socket";
import { canDodge, isDodging } from "@/rules/movement/dodge";
import { isKnockedBack } from "@/rules/movement/knockback";
import { isLunging } from "@/rules/movement/lunge";
import type { TileMap } from "@/rules/movement/tilemap";
import type { AbilitySlot } from "@/rules/spells/cast";
import { statsOf } from "@/network/session/character-stats";
import {
  applyMessage,
  createClientState,
  getSelf,
  type ClientCharacter,
  type ClientState,
} from "@/network/session/client-state";
import { getShoveStep } from "@/network/session/hero-control";
import {
  createHeroDrive,
  driveHero,
  type HeroDrive,
  type HeroFrame,
} from "@/network/session/hero-driver";
import {
  abilityOf,
  checkCast,
  createHeroCombat,
  hasRanged,
  isDead,
  isHoldSwingDue,
  isRooted,
  isStunned,
  isSwinging,
  planSwing,
  type HeroCombatState,
} from "./hero-combat";
import { chooseFacing } from "./hero-facing";
import { getLagReport, smoothRoundTrip } from "./latency";
import { easeCorrection, planCorrection } from "./position-correction";

/*
 * A headless client for one hero: what the browser client draws and what a bot's brain drives.
 * It holds the client state, moves the hero, and decides what the hero's own client decides
 * (knockback, stun, rooting, swing timing, corrections, lag), sending real commands through `send`.
 */

interface Vector {
  x: number;
  y: number;
}

type HeroSend = ClientGameSocket["emit"];

/** What a player (keys, stick, pointer) or a brain wants this frame. */
export interface HeroIntent {
  keys?: Vector;
  stick?: Vector;
  /** The way the player wants to face (latest key, stick or pointer). */
  direction?: string;
  /** Where the stick or pointer aims this frame, radians; omitted when nothing aims. */
  angle?: number;
  isAiming?: boolean;
  isAimingDodge?: boolean;
  /** Attack held: a melee weapon swings on repeat, a bow shoots when it is let go. */
  isHoldingAttack?: boolean;
  /** The ability the held attack uses. */
  abilitySlot?: AbilitySlot;
  /** The player can't move (typing in a field). */
  isBlocked?: boolean;
}

/** What is around the hero this frame. */
interface HeroFrameContext {
  seconds: number;
  /** The room's walls; without them the hero stays put. */
  map: TileMap | undefined;
  crowd?: HeroFrame["crowd"];
  isEnteringDoor?: boolean;
}

/** A swing the session sent; the browser plays it. */
export interface HeroSwing {
  count: number;
  direction: string;
  castAngle?: number;
  abilitySlot?: AbilitySlot;
}

/** What to show for the hero this frame. */
interface HeroView {
  x: number;
  y: number;
  vx: number;
  vy: number;
  direction: string;
  lastAngle: number;
  isIdle: boolean;
  /** Correction still to ease in over the coming frames. */
  ease?: Vector;
  /** A held-attack swing that went out this frame. */
  swing?: HeroSwing;
}

export interface HeroSessionOptions {
  send: HeroSend;
  now: () => number;
  /** The client state to keep; a new one by default. */
  clientState?: ClientState;
  /** Applies a server message to the client state; `applyMessage` by default. */
  apply?: (name: keyof ServerToClientEvents, ...args: unknown[]) => void;
  /** How far behind the latest poses others are drawn, ms (0 for a bot, which doesn't interpolate). */
  viewDelay?: () => number;
}

export interface HeroSession {
  readonly clientState: ClientState;
  /** The hero's own timings; the browser mirrors them onto its sprite. */
  readonly combat: HeroCombatState;
  /** Times the server rejected the hero's position. */
  readonly corrections: number;
  /** The hero's record, at the session's position rather than its lagging pose. */
  self(): ClientCharacter | undefined;
  /** Feeds one server message. */
  receive(name: string, ...args: unknown[]): void;
  /** Moves the hero one frame; undefined before `heroInit`. */
  frame(intent: HeroIntent, context: HeroFrameContext): HeroView | undefined;
  attack(swing: Omit<HeroSwing, "count">): HeroSwing | undefined;
  /** Lets go of a held attack: a bow shoots. */
  releaseAttack(swing: Omit<HeroSwing, "count" | "abilitySlot">): HeroSwing | undefined;
  /** Casts the spell in `abilitySlot`; returns its details if it went ahead. */
  cast(abilitySlot: AbilitySlot, castAngle?: number): Record<string, any> | undefined;
  /** Rolls along `angle`; false if the roll isn't ready or affordable. */
  dodge(angle: number): boolean;
  respawn(): void;
  /** Ms since the hero died, or undefined while it lives. */
  deadFor(): number | undefined;
  /** Pings the server and reports the lag it measures. */
  ping(): void;
  /** Smoothed round trip, ms. */
  roundTrip(): number;
}

const STILL: Vector = { x: 0, y: 0 };

export function createHeroSession(options: HeroSessionOptions): HeroSession {
  const { send, now } = options;
  const clientState = options.clientState ?? createClientState();
  const apply =
    options.apply ??
    ((name: string, ...args: unknown[]) =>
      (applyMessage as (s: ClientState, n: string, ...a: unknown[]) => void)(
        clientState,
        name,
        ...args,
      ));
  const viewDelay = options.viewDelay ?? (() => 0);

  let drive: HeroDrive = createHeroDrive();
  /* Where the session has the hero: the server's poses of it lag behind. */
  let hero: { x: number; y: number; roomName: string } | undefined;
  let facing = "down";
  let lastAngle = 0;
  let ease: Vector | undefined;
  let wasHolding = false;
  let roundTripMs = 0;
  let diedAt: number | undefined;
  const combat = createHeroCombat();

  const resync = () => {
    const self = getSelf(clientState);
    hero = self ? { x: self.x, y: self.y, roomName: clientState.roomName } : undefined;
    drive = createHeroDrive();
    ease = undefined;
    if (self) {
      facing = self.direction ?? facing;
      lastAngle = (self.state?.lastAngle as number | undefined) ?? lastAngle;
    }
  };

  const view = (vx: number, vy: number, swing?: HeroSwing): HeroView => ({
    x: hero!.x,
    y: hero!.y,
    vx,
    vy,
    direction: facing,
    lastAngle,
    isIdle: vx === 0 && vy === 0,
    ease,
    swing,
  });

  const move = (
    context: HeroFrameContext,
    self: ClientCharacter,
    frame: Pick<HeroFrame, "shove" | "keys" | "stick" | "isRooted" | "rollAngle" | "lungeAngle">,
    unthrottled: boolean,
  ) => {
    const result = driveHero(drive, {
      ...frame,
      hero: {
        id: self.id,
        x: hero!.x,
        y: hero!.y,
        bodySize: self.bodySize,
        roomName: hero!.roomName,
        walkSpeed: statsOf(self).walkSpeed,
      },
      map: context.map,
      crowd: context.crowd ?? { npcs: [], players: [] },
      direction: facing,
      isEnteringDoor: context.isEnteringDoor,
      unthrottled,
      seconds: context.seconds,
      now: now(),
    });
    hero!.x = result.x;
    hero!.y = result.y;
    if (result.input) send("playerInput", result.input);
    return result;
  };

  const session: HeroSession = {
    clientState,
    combat,
    corrections: 0,
    self() {
      const self = getSelf(clientState);
      if (self && hero) Object.assign(self, { x: hero.x, y: hero.y, direction: facing });
      return self;
    },
    receive(name, ...args) {
      apply(name as keyof ServerToClientEvents, ...args);
      if (name === "heroInit") {
        Object.assign(combat, createHeroCombat());
        resync();
      } else if (name === "positionCorrection") {
        (session as { corrections: number }).corrections++;
        const to = args[0] as Vector;
        const plan = hero ? planCorrection(hero, to) : ({ snap: true } as const);
        if (plan.snap) {
          resync();
          if (hero) Object.assign(hero, { x: to.x, y: to.y });
        } else {
          ease = plan.offset;
        }
      } else if (name === "knockedBack") {
        const self = getSelf(clientState);
        if (self && !isDead(self)) {
          combat.knockbackAt = now();
          combat.knockbackAngle = (args[0] as { angle: number }).angle;
        }
      }
      const self = getSelf(clientState);
      if (self && isDead(self)) diedAt ??= now();
      else diedAt = undefined;
    },
    frame(intent, context) {
      const self = getSelf(clientState);
      if (!self) return undefined;
      if (!hero || hero.roomName !== clientState.roomName) resync();
      if (!hero) return undefined;
      const time = now();

      if (ease) {
        const { step, left } = easeCorrection(ease, context.seconds * 1000);
        hero.x += step.x;
        hero.y += step.y;
        ease = left;
      }

      /* A shove takes over, even through the stun it comes with: no walking, turning or swinging */
      if (!isDead(self) && isKnockedBack(combat, time)) {
        const { vx, vy } = getShoveStep(combat.knockbackAngle ?? 0, time - combat.knockbackAt!);
        const result = move(context, self, { shove: { x: vx, y: vy } }, true);
        return view(result.vx, result.vy);
      }
      if (isDead(self) || intent.isBlocked || isStunned(self)) {
        wasHolding = false;
        return view(0, 0);
      }

      const isRolling = isDodging(combat, time);
      const isLungingNow = isLunging(combat, time);
      const aim = chooseFacing({
        hero,
        intent,
        facing,
        lastAngle,
        isSwinging: isSwinging(self, combat, time),
        combat,
        isRolling,
        isLunging: isLungingNow,
      });
      if (aim.isAimTurn)
        send("changeDirection", { direction: aim.direction, lastAngle: aim.lastAngle });
      lastAngle = aim.lastAngle;

      let swing: HeroSwing | undefined;
      if (intent.isHoldingAttack && isHoldSwingDue(self, combat, time)) {
        swing = session.attack({
          direction: aim.direction,
          castAngle: lastAngle,
          abilitySlot: intent.abilitySlot,
        });
      } else if (wasHolding && !intent.isHoldingAttack) {
        swing = session.releaseAttack({ direction: aim.direction, castAngle: lastAngle });
      }
      wasHolding = !!intent.isHoldingAttack;

      /* A melee swing commits to the way it started; bows keep turning to aim */
      const isMeleeSwing = isSwinging(self, combat, time) && !hasRanged(self);
      if (isLungingNow || !isMeleeSwing) facing = aim.direction;

      /* Every frame of a roll and the one after it, so an attack out of a roll swings from where you are */
      const unthrottled = isRolling || combat.wasRolling;
      combat.wasRolling = isRolling;
      const result = move(
        context,
        self,
        {
          keys: intent.keys ?? STILL,
          stick: intent.stick,
          isRooted: isRooted(self, combat, intent, time),
          rollAngle: isRolling ? (combat.dodgeAngle ?? 0) : undefined,
          lungeAngle: isLungingNow ? (combat.lungeAngle ?? 0) : undefined,
        },
        unthrottled,
      );
      return view(result.vx, result.vy, swing);
    },
    attack({ direction, castAngle, abilitySlot }) {
      const self = getSelf(clientState);
      if (!self) return undefined;
      const time = now();
      const planned = planSwing(self, combat, abilitySlot, time);
      if (!planned) return undefined;
      combat.lastAttack = time;
      combat.lastAttackCount = planned.count;
      if (planned.castTimes) Object.assign(combat.lastCast, planned.castTimes);
      facing = direction;
      const swing = { count: planned.count, direction, castAngle, abilitySlot };
      send("attack", swing);
      return swing;
    },
    releaseAttack(swing) {
      wasHolding = false;
      const self = getSelf(clientState);
      if (!self || !hasRanged(self)) return undefined;
      return session.attack(swing);
    },
    cast(abilitySlot, castAngle) {
      const self = getSelf(clientState);
      if (!self) return undefined;
      const time = now();
      const { allowed, castTimes } = checkCast(self, combat, abilitySlot, time);
      if (!allowed) return undefined;
      if (castTimes) Object.assign(combat.lastCast, castTimes);
      send("castSpell", { abilitySlot, castAngle });
      const ability = abilityOf(self, abilitySlot);
      /* A lunge dashes the hero, which moves itself */
      if (ability.isLunge) {
        combat.lungeAt = time;
        combat.lungeAngle = castAngle;
      }
      return ability;
    },
    dodge(angle) {
      const self = getSelf(clientState);
      if (!self) return false;
      const time = now();
      const sp = statsOf(self).sp ?? 0;
      const state = { isDead: isDead(self), lastDodge: combat.lastDodge };
      if (!canDodge({ state, sp, isStunned: isStunned(self), now: time })) return false;
      combat.lastDodge = time;
      combat.dodgeAngle = angle;
      /* Keep facing the way you were, so rolling backwards reads as a step back */
      combat.dodgeFacing = facing;
      send("dodge", { angle });
      return true;
    },
    respawn() {
      send("respawn");
    },
    deadFor() {
      return diedAt === undefined ? undefined : now() - diedAt;
    },
    ping() {
      const sentAt = now();
      send("latency", () => {
        roundTripMs = smoothRoundTrip(roundTripMs, now() - sentAt);
        send("reportLag", getLagReport(roundTripMs, viewDelay()));
      });
    },
    roundTrip() {
      return roundTripMs;
    },
  };
  return session;
}
