import { NPC_THREAT_DECAY_PER_SEC, NPC_THREAT_SWITCH_RATIO } from "./constants";

/** How much each player has angered an NPC, by socket id. */
export type ThreatTable = Readonly<Record<string, number>>;

/** `table` with `amount` more threat from `playerId`. */
export function addThreat(table: ThreatTable, playerId: string, amount: number): ThreatTable {
  if (!playerId || !(amount > 0)) return table;
  return { ...table, [playerId]: (table[playerId] ?? 0) + amount };
}

/** Threat fades over time; players whose threat runs out drop off the table. */
export function decayThreat(table: ThreatTable, deltaMs: number): ThreatTable {
  const factor = Math.max(0, 1 - (NPC_THREAT_DECAY_PER_SEC * deltaMs) / 1000);
  const next: Record<string, number> = {};
  for (const [id, threat] of Object.entries(table)) {
    const left = threat * factor;
    if (left >= 1) next[id] = left;
  }
  return next;
}

/** `table` without the players `isEligible` rejects (left the room, died). */
export function pruneThreat(table: ThreatTable, isEligible: (id: string) => boolean): ThreatTable {
  const next: Record<string, number> = {};
  for (const [id, threat] of Object.entries(table)) if (isEligible(id)) next[id] = threat;
  return next;
}

/**
 * Who the NPC should be fighting: the top of the table. It only switches away from its current
 * target once someone has clearly more threat, so it doesn't flip between two close players.
 */
export function pickThreatTarget(
  table: ThreatTable,
  currentId: string | null | undefined,
): string | undefined {
  let topId: string | undefined;
  let top = 0;
  for (const [id, threat] of Object.entries(table)) {
    if (threat > top) {
      topId = id;
      top = threat;
    }
  }
  const current = currentId ? table[currentId] : undefined;
  if (current !== undefined && top < current * NPC_THREAT_SWITCH_RATIO) return currentId as string;
  return topId;
}
