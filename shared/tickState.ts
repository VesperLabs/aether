/**
 * Subset of Character.state sent on every tick — must match server getTickStateLite / client merge.
 */
export function pickTickStateLite(s: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!s) return {};
  return {
    lockedPlayerId: s.lockedPlayerId,
    bubbleMessage: s.bubbleMessage,
    doHpRegen: s.doHpRegen,
    doBuffPoison: s.doBuffPoison,
    doHpBuffRegen: s.doHpBuffRegen,
    doMpRegen: s.doMpRegen,
    doSpRegen: s.doSpRegen,
    lastCombat: s.lastCombat,
    lastAngle: s.lastAngle,
    isAiming: s.isAiming,
    isHoldingAttack: s.isHoldingAttack,
  };
}
