import { getSwingDelay, getWeaponRange } from "@/rules/combat";
import { findSpellHits, getMeleeSwing } from "@/rules/spells";
import type { AgentBody } from "./body";
import { facing } from "./movement";
import type { SeenCharacter, Senses } from "./senses";

/** Melee reach a fighting agent keeps from its target. */
const FIGHT_DISTANCE = 20;
/** Swings wait a little past the attack delay, so clock jitter never makes one early. */
const SWING_MARGIN_MS = 30;
/** How often a fight looks again while it waits for a clear swing. */
const WAIT_MS = 50;
const DIRECTIONS = ["down", "up", "left", "right"] as const;
type Direction = (typeof DIRECTIONS)[number];

/**
 * How a fight ended: the target died (to anyone's hit), the agent died, the target left, or time
 * ran out. Swings hit everything in reach, so other mobs can die along the way; that doesn't end it.
 */
export type FightOutcome = "killed" | "died" | "gone" | "timeout";

/** An agent's weapon: it remembers the last swing, so it can wait out the attack delay. */
export function createWeapon(body: AgentBody) {
  const { senses, clock } = body;
  let lastSwingAt = -Infinity;

  const weapon = {
    cooldown(): number {
      const stats = senses.hero?.stats;
      const delay = stats?.attackDelay ? getSwingDelay(stats, 1) : 0;
      return Math.max(0, lastSwingAt + delay + SWING_MARGIN_MS - clock.now());
    },
    async attackToward(x: number, y: number, direction?: Direction) {
      const wait = weapon.cooldown();
      if (wait > 0) await clock.sleep(wait);
      lastSwingAt = clock.now();
      weapon.swingAt(x, y, direction);
    },
    swingAt(x: number, y: number, direction?: Direction) {
      const dx = x - senses.x;
      const dy = y - senses.y;
      body.link.send("attack", {
        count: 1,
        direction: direction ?? facing(dx, dy),
        castAngle: Math.atan2(dy, dx),
      });
    },
    /** Swings at an NPC until the fight ends, calling `approach` when it is out of reach. */
    async fight(
      npcId: string,
      timeoutMs: number,
      approach: (x: number, y: number) => Promise<unknown>,
    ): Promise<FightOutcome> {
      const deadline = clock.now() + timeoutMs;
      while (clock.now() < deadline) {
        if (senses.isDead) return "died";
        const target = senses.characters.get(npcId);
        if (!target) return "gone";
        if (target.isDead) return "killed";
        const swing = planSwing(senses, target);
        if (swing.direction) {
          await weapon.attackToward(target.x, target.y, swing.direction);
          await body.sync();
          continue;
        }
        /* No clean swing from here: close in, or stand on a bystander's side so they're behind */
        const [x, y] = swing.bystander
          ? stepToward(target, swing.bystander, FIGHT_DISTANCE)
          : [target.x, target.y - FIGHT_DISTANCE / 4];
        await approach(x, y);
        /* Always let time pass, so a spot that's already reached never spins the loop */
        await clock.sleep(WAIT_MS);
      }
      return "timeout";
    },
  };
  return weapon;
}

/**
 * Which way to swing at the target, judged by the server's own hit rule: a facing whose swing
 * reaches the target and catches nobody but monsters. Without one, the bystander in the way.
 */
function planSwing(senses: Senses, target: SeenCharacter) {
  const hero = senses.hero;
  const reach = hero
    ? getWeaponRange({ visibleEquipment: hero.equipment, bodySize: hero.bodySize }, "handRight")
    : FIGHT_DISTANCE;
  const victims = [...senses.characters.values()].flatMap((c) =>
    c.bodySize && c.hitBoxSize && c.id !== senses.selfId
      ? [{ ...c, bodySize: c.bodySize, hitBoxSize: c.hitBoxSize }]
      : [],
  );
  const byId = new Map(victims.map((v) => [v.id, v]));
  /* The server's own swing placement, so the prediction matches what it will hit */
  const swingY = (direction: Direction) =>
    hero
      ? getMeleeSwing(
          { y: senses.y, bodyCenterY: hero.bodyCenterY, direction, race: hero.profile?.race },
          "attack_right",
          () => reach,
        ).y
      : senses.y;
  const preferred = facing(target.x - senses.x, target.y - senses.y) as Direction;
  let bystander: SeenCharacter | undefined;
  for (const direction of [preferred, ...DIRECTIONS.filter((d) => d !== preferred)]) {
    const hits = findSpellHits({
      shape: { kind: "circle", x: senses.x, y: swingY(direction), radius: reach },
      victims,
      hitIds: [],
      allowedTargets: undefined,
      caster: { id: senses.selfId, x: senses.x, y: senses.y, isPlayer: true },
      direction,
      isMeleeAttack: true,
    });
    if (!hits.includes(target.id)) continue;
    const spared = hits
      .map((id) => byId.get(id)!)
      .find((c) => !c.isHostile && !senses.partyIds.has(c.id));
    if (!spared) return { direction };
    bystander ??= spared;
  }
  return { bystander };
}

/** The point `distance` from `from` toward `to`. */
function stepToward(
  from: { x: number; y: number },
  to: { x: number; y: number },
  distance: number,
): [number, number] {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return [
    from.x + ((to.x - from.x) / length) * distance,
    from.y + ((to.y - from.y) / length) * distance,
  ];
}
