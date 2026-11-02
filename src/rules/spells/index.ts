export {
  BUFF_SPELLS,
  canCastSpell,
  checkCastReady,
  getAbilityDetails,
  getCastReadiness,
} from "./cast";
export type { AbilitySlot, LastCast } from "./cast";
export { rollSpellCrit, rollSpellDamage } from "./damage";
export {
  getMeleeSwing,
  getSpellFlight,
  getSpellShape,
  getSpellVelocity,
  isSpellExpired,
  resolveSpellDetails,
  usesLeftHand,
  usesRightHand,
} from "./shape";
export { canHitNpc, canHitPlayer, isBehindCaster, isSpellVictimCandidate } from "./targeting";
export { findSpellHits, toSpellVictims } from "./hits";
export { characterHitBox, getAimAngle } from "./overlap";
export type { CharacterShapeInput } from "./overlap";
