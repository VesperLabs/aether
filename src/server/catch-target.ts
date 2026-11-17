/** What `isCatchable` reads off a server character. */
export function catchTargetOf(c: {
  kind?: string;
  state: { ownerId?: string | null; isDead?: boolean; catchable?: boolean };
}) {
  const { ownerId, isDead, catchable } = c.state;
  return { isPlayer: c.kind === "player", ownerId, isDead, catchable };
}
