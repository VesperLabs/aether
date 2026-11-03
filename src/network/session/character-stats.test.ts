import { describe, expect, it } from "vitest";
import type { ClientCharacter } from "./client-state";
import { applyMessage, applyStatuses, createClientState } from "./client-state";
import { playersWithVitals, selfWithVitals, statsOf, withVitals } from "./character-stats";

const base = { id: "a", stats: { hp: 10, maxHp: 10, level: 3 } } as unknown as ClientCharacter;

describe("character stats", () => {
  it("returns plain stats when no vitals arrived", () => {
    expect(statsOf(base)).toBe(base.stats);
    expect(withVitals(base)).toBe(base);
  });

  it("lays vitals over stats and caches per record", () => {
    const c = { ...base, vitals: { hp: 4, maxHp: 12, mp: 1, maxMp: 1, sp: 2, maxSp: 2 } };
    expect(statsOf(c)).toEqual({ hp: 4, maxHp: 12, level: 3, mp: 1, maxMp: 1, sp: 2, maxSp: 2 });
    expect(statsOf(c)).toBe(statsOf(c));
    expect(withVitals(c).stats).toBe(statsOf(c));
    expect(withVitals(c)).toBe(withVitals(c));
    expect(base.stats.hp).toBe(10);
  });

  it("lists the hero and players with their vitals", () => {
    const state = createClientState();
    const hero = { ...base, socketId: "a", nid: 0 } as ClientCharacter;
    const other = { ...base, id: "b", socketId: "b", nid: 1 } as ClientCharacter;
    applyMessage(state, "heroInit", { socketId: "a", players: [hero, other] } as never);
    applyStatuses(state, { p: [{ id: "a", state: {}, v: [3, 10, 0, 0, 0, 0] }] });
    expect(selfWithVitals(state)?.stats.hp).toBe(3);
    expect(playersWithVitals(state).map((p) => p.stats.hp)).toEqual([3, 10]);
  });
});
