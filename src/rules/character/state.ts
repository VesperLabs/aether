import type { LastCast } from "@/rules/spells";

/**
 * The `state` bag on a character: flags and timers that many rules read and write. Times are
 * `Date.now()` milliseconds. Keys the server and client add on their own (NPC content flags,
 * client animation state) are still open-ended.
 */
export interface CharacterState {
  isRobot: boolean;
  isAggro: boolean;
  isDead: boolean;
  isIdle: boolean;
  isAttacking?: boolean;
  isPotioning: boolean;
  isCharging: boolean;
  isHovering: boolean;
  isEnteringDoor: boolean;
  setFlash: boolean;
  doHpRegen: boolean;
  doBuffPoison: boolean;
  doBuffBleed: boolean;
  doBuffBurn: boolean;
  doHpBuffRegen: boolean;
  doMpRegen: boolean;
  doSpRegen: boolean;
  lastTeleport: number;
  deadTime: number;
  lastBuffPoison: number;
  lastBuffBleed: number;
  lastBuffBurn: number;
  lastHpRegen: number;
  lastHpBuffRegen: number;
  lastMpRegen: number;
  lastSpRegen: number;
  lastCombat: number;
  lastPotion: number;
  lastAttack: number;
  /** The last swing: 1 is the main hand, 2 a dual-wielder's left (see `getNextAttackCount`). */
  lastAttackCount?: number;
  /** A player's sp / maxSp when they last swung, before paying for it: sets the swing's damage. */
  swingStamina?: number;
  /** When the last dodge roll started. */
  lastDodge?: number;
  /** When the character last cast stealth, in ms. */
  lastStealth?: number;
  /** Client only: holding the dodge button, aiming the roll. */
  isAimingDodge?: boolean;
  /** Client only: when a tap-aimable press (dodge, lunge) went down, to tell a tap from a hold. */
  aimPressedAt?: number;
  /** Client only: the angle the current roll is heading. */
  dodgeAngle?: number;
  /** Client only: the way the hero faced when the roll started; it keeps facing that way. */
  dodgeFacing?: string;
  /** Client only: the rig is frozen in the roll pose. */
  isDodgePosed?: boolean;
  /** Client only: the hero was rolling last frame. */
  wasRolling?: boolean;
  lastFlash: number;
  lastCast: LastCast;
  /** NPC only: out of the world for a while (outside its actor's `active` times). */
  isAway?: boolean;
  /** NPC only: killing it is worth no experience. */
  noExp?: boolean;
  /** NPC only: when it began its one retreat this fight. */
  retreatAt?: number;
  /** NPC only: the habitat it is in, of its body's several (a bird in the `air`); unset or null is the first. */
  habitat?: string | null;
  /** NPC only: when a player last came too near it, while `skittish`. */
  scaredAt?: number;
  /** NPC only: where a scared `skittish` NPC is getting away to. */
  escapeTo?: { x: number; y: number };
  /** NPC only: loop time of the next wander direction change. */
  nextWanderAt?: number;
  /** When the last lunge started (see `rules/movement/lunge.ts`). */
  lungeAt?: number;
  /** Which way that lunge heads, in radians. */
  lungeAngle?: number;
  /** How long that lunge lasts, in ms. */
  lungeMs?: number;
  /** When the last knockback started (see `rules/movement/knockback.ts`). */
  knockbackAt?: number;
  /** Which way that knockback pushes, in radians. */
  knockbackAngle?: number;
  /** Radians. */
  lastAngle: number;
  activeSets: string[];
  hasBuffChanges?: boolean;
  isAiming?: boolean;
  isHoldingAttack?: boolean;
  /** The ball held out to throw (its base), so every client draws it in the hand. */
  aimingBall?: string | null;
  /** The spell being aimed, so the crosshair fades with its cooldown instead of the attack's. */
  aimingSpellName?: string | null;
  bubbleMessage?: string | null;
  lastBubbleMessage?: number;
  npcAttackReady?: boolean;
  /** NPC only: the player it belongs to, if it owns it, as a pet or follower (see `rules/allegiance`). */
  ownerId?: string | null;
  // Also `targetNpcId` and NPCs' `lockedPlayerId`, which callers read as several types.
  // oxlint-disable-next-line typescript/no-explicit-any
  [key: string]: any;
}
