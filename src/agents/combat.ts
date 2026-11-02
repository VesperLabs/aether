import { getSwingDelay } from "@/rules/combat";
import type { AgentBody } from "./body";
import { facing } from "./movement";

/** Melee reach a fighting agent keeps from its target. */
const FIGHT_DISTANCE = 20;
/** Swings wait a little past the attack delay, so clock jitter never makes one early. */
const SWING_MARGIN_MS = 30;

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
    async attackToward(x: number, y: number) {
      const wait = weapon.cooldown();
      if (wait > 0) await clock.sleep(wait);
      lastSwingAt = clock.now();
      weapon.swingAt(x, y);
    },
    swingAt(x: number, y: number) {
      const dx = x - senses.x;
      const dy = y - senses.y;
      body.link.send("attack", {
        count: 1,
        direction: facing(dx, dy),
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
        const far = Math.hypot(target.x - senses.x, target.y - senses.y) > FIGHT_DISTANCE;
        if (far) await approach(target.x, target.y - FIGHT_DISTANCE / 2);
        await weapon.attackToward(target.x, target.y);
        await body.sync();
      }
      return "timeout";
    },
  };
  return weapon;
}
