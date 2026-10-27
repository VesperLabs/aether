/** A player who dies keeps this share of their experience. */
export const DEATH_EXP_KEPT = 0.9;

/** Experience after dying: 10% is lost (only if there is any). */
export function expAfterDeath(exp: number) {
  return exp > 0 ? Math.floor(exp * DEATH_EXP_KEPT) : exp;
}

export interface RespawnInput {
  deadTime: number;
  respawnTime: number;
  now: number;
}

/** True once a dead mob has waited out its respawn time. */
export function isRespawnDue({ deadTime, respawnTime, now }: RespawnInput) {
  return now - deadTime >= respawnTime;
}
