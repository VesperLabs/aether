import { shapesOverlap, type Shape } from "../movement";
import { characterBodyCircle, characterHitBox, type CharacterShapeInput } from "./overlap";
import { isBehindCaster, isSpellVictimCandidate, type SpellTargets } from "./targeting";

/** What the hit check reads from a possible victim. */
export interface SpellVictim extends CharacterShapeInput {
  id: string;
  isDead: boolean;
}

export interface SpellHitInput {
  /** The area the spell covers now; null hits nothing. */
  shape: Shape | null;
  victims: readonly SpellVictim[];
  hitIds: readonly string[];
  allowedTargets: SpellTargets;
  caster: { id: string; x: number; y: number; isPlayer: boolean };
  targetId?: string;
  direction?: string;
  isMeleeAttack: boolean;
}

/**
 * Which victims the spell hits this tick, in order. Returns the new ids only; the caller adds
 * them to its hit list. NPC single-target melee tests against the smaller body circle.
 */
export function findSpellHits(input: SpellHitInput): string[] {
  const { shape, victims, allowedTargets, caster, targetId, direction, isMeleeAttack } = input;
  if (!shape) return [];
  const hitIds = [...input.hitIds];
  const hits: string[] = [];
  const isNpcSingleTargetMelee = Boolean(targetId) && !caster.isPlayer && isMeleeAttack;
  for (const victim of victims) {
    if (
      !isSpellVictimCandidate({
        victimId: victim.id,
        victimIsDead: victim.isDead,
        hitIds,
        allowedTargets,
        casterId: caster.id,
        targetId,
      })
    ) {
      continue;
    }
    const area: Shape = isNpcSingleTargetMelee
      ? { kind: "circle", ...characterBodyCircle(victim) }
      : { kind: "box", ...characterHitBox(victim) };
    if (!shapesOverlap(area, shape)) continue;
    if (isMeleeAttack && isBehindCaster(direction, victim, caster)) continue;
    if (!hitIds.includes(victim.id)) hitIds.push(victim.id);
    hits.push(victim.id);
  }
  return hits;
}
