import { encodeWireDirection } from "@/network";
import type { AgentBody } from "./body";

/** How often a walking agent reports its position, like a client on a 20 fps network tick. */
const STEP_MS = 50;
/** Agents walk a little under their speed so the server's speed check never trips on timing. */
const SPEED_MARGIN = 0.85;
/** How close counts as having arrived, in pixels. */
const ARRIVE_DISTANCE = 4;
const DEFAULT_WALK_SPEED = 100;

/**
 * Walks in a straight line at walking speed, reporting each step like a client. Stops early when
 * the server corrects it (a wall, the map edge). Resolves with whether it got there.
 */
export async function walkTo(body: AgentBody, x: number, y: number, timeoutMs: number) {
  const { senses, clock, link } = body;
  const correctionsBefore = senses.corrections.length;
  const corrected = () => senses.corrections.length > correctionsBefore;
  const speed = senses.hero?.stats?.walkSpeed ?? DEFAULT_WALK_SPEED;
  const step = (speed * SPEED_MARGIN * STEP_MS) / 1000;
  const deadline = clock.now() + timeoutMs;
  while (clock.now() < deadline && !corrected()) {
    const dx = x - senses.x;
    const dy = y - senses.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= ARRIVE_DISTANCE) break;
    const move = Math.min(step, distance);
    senses.x += (dx / distance) * move;
    senses.y += (dy / distance) * move;
    link.send("playerInput", {
      x: senses.x,
      y: senses.y,
      vx: (dx / distance) * speed,
      vy: (dy / distance) * speed,
      d: encodeWireDirection(facing(dx, dy)),
      roomName: senses.roomName,
    });
    await clock.sleep(STEP_MS);
  }
  sendPosition(body, senses.x, senses.y);
  await body.sync();
  return !corrected() && Math.hypot(x - senses.x, y - senses.y) <= ARRIVE_DISTANCE;
}

/** Reports standing at a position, legal or not; the server decides. */
export function sendPosition({ link }: AgentBody, x: number, y: number) {
  link.send("playerInput", { x, y, vx: 0, vy: 0 });
}

/** The four-way facing the game uses for a movement or aim vector. */
export function facing(dx: number, dy: number) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}
