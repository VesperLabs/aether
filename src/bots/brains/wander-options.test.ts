import { describe, expect, it } from "vitest";
import type { TiledMapJson } from "@/rules/movement";
import { createRng } from "@/rules/world";
import { createAtlas } from "../atlas";
import { createSenses, type SeenCharacter } from "../senses";
import type { Option } from "../planner";
import { scriptedPlanner, type Temperament } from "./scripted-planner";
import { listOptions } from "./wander-options";

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

/** Lists options and lets a scripted planner with this temperament choose, 200 times over. */
async function pickMany(
  senses: ReturnType<typeof sensesWith>,
  temperament: Temperament,
  recentRooms: string[] = [],
) {
  const rng = createRng(7);
  const planner = scriptedPlanner(rng, temperament);
  const picks: Option[] = [];
  for (let i = 0; i < 200; i++) {
    const options = listOptions(senses, room, rng);
    if (!options.length) continue;
    const { choice } = await planner({ roomName: "test", recentRooms, goalsHere: 0, options });
    picks.push(options[choice]);
  }
  return picks;
}

describe("wandering", () => {
  it("only picks spots it can walk to", async () => {
    const goals = await pickMany(sensesWith(), calm);
    expect(goals.length).toBeGreaterThan(0);
    expect(goals.every((g) => g.spot.x < 10 * TILE)).toBe(true);
  });

  it("keeps away from monsters", async () => {
    const mob = { x: 160, y: 320, isHostile: true };
    const goals = await pickMany(sensesWith(mob), calm);
    expect(goals.length).toBeGreaterThan(0);
    expect(goals.every((g) => Math.hypot(g.spot.x - mob.x, g.spot.y - mob.y) >= 160)).toBe(true);
  });

  it("favours doors to rooms it hasn't been in lately", async () => {
    const goals = await pickMany(sensesWith(), { ...calm, restlessness: 1 }, ["old"]);
    const doors = goals.flatMap((g) => (g.kind === "door" ? [g.door.destMap] : []));
    const fresh = doors.filter((d) => d === "new").length;
    expect(fresh).toBeGreaterThan((doors.length - fresh) * 3);
  });

  it("goes over to look at a keeper, stopping beside them", async () => {
    const keeper = { x: 200, y: 450, name: "Danny" };
    const [goal] = await pickMany(sensesWith(keeper), { ...calm, curiosity: 1 });
    expect(goal).toMatchObject({ kind: "visit", label: "go look at Danny" });
    const away = Math.hypot(goal.spot.x - keeper.x, goal.spot.y - keeper.y);
    expect(away).toBeCloseTo(40);
  });
});
