/**
 * Draws remote characters slightly in the past, blending between the two server ticks around the
 * render time. The delay adapts to the connection: one tick plus a margin for how unevenly ticks
 * arrive, so steady connections see others nearly live and jittery ones still get smooth motion.
 */

import type { Pose, RoomPoses } from "@/network/sync";

/** A pose blended for the current frame. */
export interface PoseSample {
  x: number;
  y: number;
  vx: number;
  vy: number;
  d: number;
}

export interface PoseFrame {
  players: Map<string, PoseSample>;
  npcs: Map<string, PoseSample>;
  /** Server times of the two ticks blended, to skip characters that teleported in between. */
  olderTime: number;
  newerTime: number;
}

interface Tick {
  t: number;
  players: Map<string, Pose>;
  npcs: Map<string, Pose>;
}

const MAX_TICKS = 30;
/** Past this the clock jumped (tab asleep, reconnect): resync instead of easing. */
const CLOCK_RESYNC_MS = 400;
/** How fast the clock offset, jitter and delay follow new ticks. */
const SMOOTHING = 0.1;
/** Jitter margins on top of one tick: covers most late ticks without adding much delay. */
const JITTER_MARGIN = 2.5;
const MAX_DELAY_MS = 300;

const byId = (poses: Pose[]) => new Map(poses.map((pose) => [pose[0], pose]));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

export function createInterpolator(tickMs: number) {
  const ticks: Tick[] = [];
  /** Local time minus server time, smoothed. */
  let offset: number | null = null;
  let jitter = 0;
  let delay = tickMs * 2;

  function add(poses: RoomPoses, arrivedAt: number) {
    const newest = ticks[ticks.length - 1];
    if (newest && poses.t <= newest.t) return; // late or duplicate: a newer one is already here
    ticks.push({ t: poses.t, players: byId(poses.p), npcs: byId(poses.n) });
    if (ticks.length > MAX_TICKS) ticks.shift();

    const sample = arrivedAt - poses.t;
    if (offset === null || Math.abs(sample - offset) > CLOCK_RESYNC_MS) {
      offset = sample;
      jitter = 0;
    } else {
      jitter += (Math.abs(sample - offset) - jitter) * SMOOTHING;
      offset += (sample - offset) * SMOOTHING;
    }
    const target = Math.min(tickMs + jitter * JITTER_MARGIN, MAX_DELAY_MS);
    delay += (target - delay) * SMOOTHING;
  }

  /** Forget everything, e.g. on a room change. */
  function reset() {
    ticks.length = 0;
  }

  function blend(older: Map<string, Pose>, newer: Map<string, Pose>, u: number) {
    const out = new Map<string, PoseSample>();
    for (const [id, b] of newer) {
      const a = older.get(id) ?? b;
      out.set(id, {
        x: lerp(a[1], b[1], u),
        y: lerp(a[2], b[2], u),
        vx: lerp(a[3], b[3], u),
        vy: lerp(a[4], b[4], u),
        d: b[5],
      });
    }
    return out;
  }

  /** Remote poses at local time `now`, or null until two ticks are buffered. */
  function sample(now: number): PoseFrame | null {
    if (offset === null || ticks.length < 2) return null;
    const renderTime = now - offset - delay;
    let i = ticks.length - 2;
    while (i > 0 && ticks[i].t > renderTime) i--;
    const older = ticks[i];
    const newer = ticks[i + 1];
    /* Past the newest tick (a late one): hold the newest instead of guessing ahead */
    const u = Math.max(0, Math.min(1, (renderTime - older.t) / (newer.t - older.t)));
    return {
      players: blend(older.players, newer.players, u),
      npcs: blend(older.npcs, newer.npcs, u),
      olderTime: older.t,
      newerTime: newer.t,
    };
  }

  return { add, reset, sample };
}
