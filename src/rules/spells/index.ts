export {
  canCastSpell,
  checkCastReady,
  getAbilityDetails,
  getCastReadiness,
  getSpellCooldown,
} from "./cast";
export type { AbilityDetails, AbilitySlot, LastCast } from "./cast";
export { rollSpellCrit, rollSpellDamage } from "./damage";
export {
  getMeleeSwing,
  getSpell,
  getSpellFlight,
  getSpellShape,
  getSpellVelocity,
  isAimed,
  isSpellExpired,
  ridesCaster,
  strikesWithWeapon,
  usesLeftHand,
  usesRightHand,
} from "./shape";
export { canHitNpc, canHitPlayer, isBehindCaster, isSpellVictimCandidate } from "./targeting";
export { findSpellHits, toSpellVictims } from "./hits";
export {
  SWING_DEGREES,
  SWING_TRAIL_FRACTION,
  getSwingActiveMs,
  getSwingShape,
  isSwingClockwise,
  planSwing,
} from "./swing";
export type { SwingPlan } from "./swing";
export { characterHitBox, getAimAngle } from "./overlap";
export type { CharacterShapeInput } from "./overlap";
