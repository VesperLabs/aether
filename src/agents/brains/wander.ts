import type { Rng } from "@/rules/world";
import { findDoorstep, type KnownRoom } from "../atlas";
import type { Brain } from "../brain";

/** How often a wanderer heads for a door instead of a spot in the room. */
const DOOR_CHANCE = 0.3;
const PAUSE_MS = { min: 500, max: 2500 };
/** How many random tiles to try before giving up on finding an open one. */
const SPOT_TRIES = 50;

/**
 * Roams the whole map: walks around walls to random open spots, idles a moment, and now and
 * then takes a door into the next zone.
 */
export const wander: Brain = async (agent, { clock, rng, signal }) => {
  while (!signal.aborted) {
    const doors = Object.values(agent.room.doors).filter((d) => d.destMap && d.destDoor);
    if (doors.length && rng() < DOOR_CHANCE) {
      const door = doors[Math.floor(rng() * doors.length)];
      const doorstep = findDoorstep(agent.room, door);
      if (doorstep && (await agent.travelTo(doorstep))) await agent.enterDoor(door.name);
    } else {
      const spot = randomOpenSpot(agent.room, rng);
      if (spot) await agent.travelTo(spot);
    }
    await clock.sleep(PAUSE_MS.min + rng() * (PAUSE_MS.max - PAUSE_MS.min));
  }
};

/** The centre of a random tile without a wall, if one turns up. */
function randomOpenSpot({ map: { grid } }: KnownRoom, rng: Rng) {
  for (let i = 0; i < SPOT_TRIES; i++) {
    const x = Math.floor(rng() * grid.width);
    const y = Math.floor(rng() * grid.height);
    if (!grid.solid[y][x]) {
      return { x: (x + 0.5) * grid.tileWidth, y: (y + 0.5) * grid.tileHeight };
    }
  }
  return undefined;
}
