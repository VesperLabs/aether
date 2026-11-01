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
  doHpBuffRegen: boolean;
  doMpRegen: boolean;
  doSpRegen: boolean;
  lastTeleport: number;
  deadTime: number;
  lastBuffPoison: number;
  lastHpRegen: number;
  lastHpBuffRegen: number;
  lastMpRegen: number;
  lastSpRegen: number;
  lastCombat: number;
  lastPotion: number;
  lastAttack: number;
  /** When the last dodge roll started. */
  lastDodge?: number;
  /** Client only: holding the dodge button, aiming the roll. */
  isAimingDodge?: boolean;
  /** Client only: when the dodge button went down, to tell a tap from a hold. */
  dodgePressedAt?: number;
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
  /** NPC only: loop time of the next wander direction change. */
  nextWanderAt?: number;
  /** NPC only: when its last lunge started. */
  lungeAt?: number;
  /** NPC only: which way that lunge heads, in radians. */
  lungeAngle?: number;
  /** Client only: when this client saw the NPC's last lunge start, for its trail. */
  lungeSeenAt?: number;
  /** Radians. */
  lastAngle: number;
  activeSets: string[];
  hasBuffChanges?: boolean;
  isAiming?: boolean;
  isHoldingAttack?: boolean;
  /** The spell being aimed, so the crosshair fades with its cooldown instead of the attack's. */
  aimingSpellName?: string | null;
  bubbleMessage?: string | null;
  lastBubbleMessage?: number;
  npcAttackReady?: boolean;
  // Also `targetNpcId` and NPCs' `lockedPlayerId`, which callers read as several types.
  // oxlint-disable-next-line typescript/no-explicit-any
  [key: string]: any;
}
