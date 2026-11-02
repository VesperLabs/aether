import { describe, expect, it } from "vitest";
import type { TiledMapJson } from "@/rules/movement";
import { createRng } from "@/rules/world";
import { createAtlas } from "../atlas";
import { createSenses, type SeenCharacter } from "../senses";
import { pickGoal, type Temperament } from "./wander-goals";

const SIZE = 20;
const TILE = 32;

/** A 20x20 open map with a wall down column 10, splitting it in two, and two doors on the left. */
function testMap(): TiledMapJson {
  const data = Array.from({ length: SIZE * SIZE }, (_, i) => (i % SIZE === 10 ? 2 : 0));
  const door = (name: string, x: number, destMap: string) => ({
    name,
    x,
    y: 0,
    width: TILE,
    height: TILE,
    properties: [
      { name: "destMap", value: destMap },
      { name: "destDoor", value: "in" },
    ],
  });
  return {
    width: SIZE,
    height: SIZE,
    tilewidth: TILE,
    tileheight: TILE,
    tilesets: [
      { firstgid: 1, tiles: [{ id: 1, properties: [{ name: "collides", value: true }] }] },
    ],
    layers: [
      { name: "Collide", type: "tilelayer", data },
      {
        name: "Doors",
        type: "objectgroup",
        objects: [door("to-old", 32, "old"), door("to-new", 256, "new")],
      },
    ],
  };
}

const room = createAtlas(() => testMap())("test");

/** Senses standing on the left half, with these characters around. */
function sensesWith(...characters: Partial<SeenCharacter>[]) {
  const { senses } = createSenses();
  Object.assign(senses, { selfId: "me", x: 150, y: 300, roomName: "test" });
  characters.forEach((c, i) => {
    const id = `c${i}`;
    senses.characters.set(id, {
      id,
      name: id,
      kind: "npc",
      isHostile: false,
      isDead: false,
      x: 0,
      y: 0,
      ...c,
    });
  });
  return senses;
}

const calm: Temperament = { pace: 1, curiosity: 0, restlessness: 0 };

function pickMany(
  senses: ReturnType<typeof sensesWith>,
  temperament: Temperament,
  recentRooms: string[] = [],
) {
  const rng = createRng(7);
  return Array.from({ length: 200 }, () =>
    pickGoal(senses, room, { temperament, memory: { recentRooms, goalsHere: 0 }, rng }),
  ).filter((g) => g !== undefined);
}

describe("pickGoal", () => {
  it("only picks spots it can walk to", () => {
    const goals = pickMany(sensesWith(), calm);
    expect(goals.length).toBeGreaterThan(0);
    expect(goals.every((g) => g.spot.x < 10 * TILE)).toBe(true);
  });

  it("keeps away from monsters", () => {
    const mob = { x: 160, y: 320, isHostile: true };
    const goals = pickMany(sensesWith(mob), calm);
    expect(goals.length).toBeGreaterThan(0);
    expect(goals.every((g) => Math.hypot(g.spot.x - mob.x, g.spot.y - mob.y) >= 160)).toBe(true);
  });

  it("favours doors to rooms it hasn't been in lately", () => {
    const doors = pickMany(sensesWith(), { ...calm, restlessness: 1 }, ["old"]).flatMap((g) =>
      g.kind === "door" ? [g.door.destMap] : [],
    );
    const fresh = doors.filter((d) => d === "new").length;
    expect(fresh).toBeGreaterThan((doors.length - fresh) * 3);
  });

  it("goes over to look at a keeper, stopping beside them", () => {
    const keeper = { x: 200, y: 450, name: "Danny" };
    const [goal] = pickMany(sensesWith(keeper), { ...calm, curiosity: 1 });
    expect(goal).toMatchObject({ kind: "visit", what: "Danny" });
    const away = Math.hypot(goal.spot.x - keeper.x, goal.spot.y - keeper.y);
    expect(away).toBeCloseTo(40);
  });
});
