import { encodeTickVitals, type TickVitals } from "./vitals";

/*
 * Statuses: the state flags and vitals clients animate from. Unlike poses they go out only when they
 * change, on a reliable channel, so a client always holds the latest without resending it each tick.
 */

/** A character's flags and vitals. */
export interface CharacterStatus {
  id: string;
  state: Record<string, unknown>;
  /** Current and max hp, mp and sp: see `encodeTickVitals`. */
  v: TickVitals;
}

/** The statuses that changed in a room this tick. */
export interface RoomStatuses {
  p?: CharacterStatus[];
  n?: CharacterStatus[];
}

export interface StatusInput {
  id?: string;
  socketId?: string;
  room?: { name?: string } | null;
  state?: Record<string, unknown> | null;
  stats?: Record<string, unknown> | null;
}

/** The subset of a character's state clients use, not the whole state blob. */
function pickStatusState(s: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!s) return {};
  return {
    lockedPlayerId: s.lockedPlayerId,
    ownerId: s.ownerId,
    bubbleMessage: s.bubbleMessage,
    doBuffPoison: s.doBuffPoison,
    doHpBuffRegen: s.doHpBuffRegen,
    lastCombat: s.lastCombat,
    lastAngle: s.lastAngle,
    isAiming: s.isAiming,
    isHoldingAttack: s.isHoldingAttack,
  };
}

function getCharacterStatus(c: StatusInput): CharacterStatus {
  return {
    id: (c.socketId || c.id) as string,
    state: pickStatusState(c.state),
    v: encodeTickVitals(c.stats),
  };
}

/**
 * The statuses in a room that differ from what was last sent. `sent` remembers each character's last
 * sent status and is updated; characters gone from the room are forgotten.
 */
export function takeChangedStatuses(
  world: {
    players: Readonly<Record<string, StatusInput>>;
    npcs: Readonly<Record<string, StatusInput>>;
  },
  roomName: string,
  sent: Map<string, string>,
): RoomStatuses | null {
  const seen = new Set<string>();
  const changed = (list: Readonly<Record<string, StatusInput>>) => {
    const out: CharacterStatus[] = [];
    for (const c of Object.values(list)) {
      if (c?.room?.name !== roomName) continue;
      const status = getCharacterStatus(c);
      const key = JSON.stringify(status);
      seen.add(status.id);
      if (sent.get(status.id) === key) continue;
      sent.set(status.id, key);
      out.push(status);
    }
    return out;
  };
  const p = changed(world.players);
  const n = changed(world.npcs);
  for (const id of sent.keys()) if (!seen.has(id)) sent.delete(id);
  if (!p.length && !n.length) return null;
  return { ...(p.length ? { p } : {}), ...(n.length ? { n } : {}) };
}
