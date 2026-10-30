/**
 * Subset of Character.state sent on every tick — must match getTickStateLite / client merge.
 */
export function pickTickStateLite(
  s: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!s) return {};
  return {
    lockedPlayerId: s.lockedPlayerId,
    bubbleMessage: s.bubbleMessage,
    doBuffPoison: s.doBuffPoison,
    doHpBuffRegen: s.doHpBuffRegen,
    lastCombat: s.lastCombat,
    lastAngle: s.lastAngle,
    isAiming: s.isAiming,
    isHoldingAttack: s.isHoldingAttack,
  };
}
