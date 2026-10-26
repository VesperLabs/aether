export { BUFF_SPELLS, canCastSpell, checkCastReady, getAbilityDetails } from "./cast";
export type {
  AbilityDetailsInput,
  CanCastInput,
  CanCastResult,
  CastAbility,
  CastReadyInput,
  LastCast,
} from "./cast";
export { SPELL_POWER_ELEMENTAL_FACTOR, rollSpellCrit, rollSpellDamage } from "./damage";
export type { SpellCrit } from "./damage";
export {
  getSpellShape,
  getSpellVelocity,
  isSpellExpired,
  resolveSpellDetails,
  usesLeftHand,
  usesRightHand,
} from "./shape";
export type { ResolvedSpell, SpellLifeInput, SpellShape } from "./shape";
export { canHitNpc, canHitPlayer, isBehindCaster, isSpellVictimCandidate } from "./targeting";
export type { PlayerTargetInput, Point, SpellTargets, VictimCheckInput } from "./targeting";
export { characterBodyCircle, characterHitBox } from "./overlap";
export type { CharacterShapeInput } from "./overlap";
