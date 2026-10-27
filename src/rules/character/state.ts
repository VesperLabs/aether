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
  lastFlash: number;
  lastCast: LastCast;
  /** Radians. */
  lastAngle: number;
  activeSets: string[];
  hasBuffChanges?: boolean;
  isAiming?: boolean;
  isHoldingAttack?: boolean;
  bubbleMessage?: string | null;
  lastBubbleMessage?: number;
  npcAttackReady?: boolean;
  // Also `targetNpcId` and NPCs' `lockedPlayerId`, which callers read as several types.
  // oxlint-disable-next-line typescript/no-explicit-any
  [key: string]: any;
}
