import type { Rng } from "@/rules/world";
import type { NpcPlayerView } from "../aggro";
import type { NpcBehaviorInput, NpcMovement } from "../decide";
import type { ShotBand } from "../reach";

/** What a behavior sees when it is scored and run. */
export interface BehaviorContext {
  input: NpcBehaviorInput;
  /** The player the NPC is locked on to, if any. */
  target: NpcPlayerView | null;
  /** The target is alive and still within aggro range. */
  canChase: boolean;
  attackRange: number;
  /** Where its next shot lands from, for NPCs that shoot. Unset for pure melee. */
  standBand: ShotBand | undefined;
  /** No wall between the NPC and its target. */
  hasClearShot: boolean;
  /** A melee NPC close enough to swing at its target. */
  inMeleeReach: boolean;
  /** The NPC is attacking this tick (it stays put while it does). */
  isAttacking: boolean | undefined;
  /** Leashed: walking home to heal, ignoring players. */
  isResetting: boolean;
}

/**
 * One thing an NPC can be doing. Each tick the brain scores every behavior the NPC has and runs the
 * highest; 0 means "not now". Behaviors are pure and only describe a movement.
 */
export interface NpcBehavior {
  score(ctx: BehaviorContext): number;
  move(ctx: BehaviorContext, rng: Rng): NpcMovement;
  /** Fighting a target. Choosing anything else drops the target. */
  engaged?: boolean;
  /** Neither attacks nor casts while chosen, so it doesn't turn on the target mid-run. */
  holdsFire?: boolean;
}

/**
 * One thing an NPC can be doing. Each tick the brain scores every behavior and runs the highest;
 * 0 means "not now". Behaviors are pure and only describe a movement.
 */
export interface NpcBehavior {
  score(ctx: BehaviorContext): number;
  move(ctx: BehaviorContext, rng: Rng): NpcMovement;
  /** Fighting a target. Choosing anything else drops the target. */
  engaged?: boolean;
  /** Neither attacks nor casts while chosen, so it doesn't turn on the target mid-run. */
  holdsFire?: boolean;
}
