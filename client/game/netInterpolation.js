/**
 * Client snapshot buffer + linear blend between two authoritative server ticks.
 *
 * - Position is strictly lerped between past server (x,y) samples — no extrapolation, no splines that
 *   overshoot endpoints (Hermite can leave the segment and look like clipping).
 * - Real collision is server-side Phaser; the client only displays interpolated poses.
 */

import { DEFAULT_SERVER_FPS } from "../../shared/constants";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * @param {object} options
 * @param {number} [options.serverFps]
 * @param {number} [options.bufferTicks] — delay = (1000/fps)*ticks
 * @param {number} [options.maxSnapshots]
 */
export function createNetInterpolator(options = {}) {
  const serverFps = options.serverFps ?? DEFAULT_SERVER_FPS;
  const bufferTicks = options.bufferTicks ?? 2;
  const maxSnapshots = options.maxSnapshots ?? 120;
  const bufferMs = (1000 / serverFps) * bufferTicks;

  let timeOffset = -1;
  const vault = [];

  function addSnapshot(snapshot) {
    if (!snapshot?.time) return;
    const timeNow = Date.now();
    const ts = snapshot.time;
    if (timeOffset === -1) {
      timeOffset = timeNow - ts;
    } else {
      const o = timeNow - ts;
      if (Math.abs(timeOffset - o) > 50) {
        timeOffset = o;
      }
    }
    vault.push(snapshot);
    while (vault.length > maxSnapshots) {
      vault.shift();
    }
  }

  /**
   * @param {"players" | "npcs"} key
   * @returns {null | {
   *   state: object[],
   *   olderId: string,
   *   newerId: string,
   *   olderTime: number,
   *   newerTime: number
   * }}
   */
  function interpolateEntityList(key) {
    if (timeOffset === -1 || vault.length < 2) return null;

    const serverTime = Date.now() - timeOffset - bufferMs;
    const sorted = [...vault].sort((a, b) => b.time - a.time);

    let older;
    let newer;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].time <= serverTime) {
        older = sorted[i];
        newer = sorted[i - 1];
        break;
      }
    }
    if (!older || !newer) return null;

    const t0 = older.time;
    const t1 = newer.time;
    const dur = t1 - t0;
    if (dur <= 0) return null;

    let u = (serverTime - t0) / dur;
    u = Math.max(0, Math.min(1, u));

    const olderArr = older.state[key] || [];
    const newerArr = newer.state[key] || [];
    const out = [];

    for (const e1 of newerArr) {
      const e0 = olderArr.find((e) => e.id === e1.id);
      if (!e0) {
        out.push({ ...e1 });
        continue;
      }

      const x0 = e0.x ?? 0;
      const y0 = e0.y ?? 0;
      const x1 = e1.x ?? 0;
      const y1 = e1.y ?? 0;
      const vx0 = e0.vx ?? 0;
      const vy0 = e0.vy ?? 0;
      const vx1 = e1.vx ?? 0;
      const vy1 = e1.vy ?? 0;

      out.push({
        ...e1,
        x: lerp(x0, x1, u),
        y: lerp(y0, y1, u),
        vx: lerp(vx0, vx1, u),
        vy: lerp(vy0, vy1, u),
      });
    }

    return {
      state: out,
      olderId: older.id,
      newerId: newer.id,
      olderTime: older.time,
      newerTime: newer.time,
    };
  }

  return { addSnapshot, interpolateEntityList };
}
