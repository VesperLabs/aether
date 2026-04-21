/**
 * Client snapshot buffer + cubic Hermite blend between two authoritative server ticks.
 *
 * - Vault is kept sorted by snapshot time (insert on add). Interpolation uses binary search.
 * - Real collision is server-side Phaser; the client only displays interpolated poses.
 * - Position uses Hermite with snapshot velocity as the tangent (hides the 20 Hz stepping
 *   that plain lerp produces on turns). Overshoot is clamped at stop / start transitions.
 * - When the newest snapshot is behind the render clock we extrapolate from the last
 *   segment for up to one buffer window before freezing — masks single-packet dropouts
 *   the same way Minecraft does.
 */

import { DEFAULT_SERVER_FPS, expandTickState, mergeTickDelta } from "@aether/shared/net";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Cubic Hermite evaluated at u in [0,1] with tangents already scaled to the segment.
 * h00 = 2u^3 - 3u^2 + 1   h10 = u^3 - 2u^2 + u
 * h01 = -2u^3 + 3u^2      h11 = u^3 - u^2
 */
function hermite(p0, p1, m0, m1, u) {
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
}

/** Shallow clone sufficient to use as a delta merge baseline — entities themselves are not mutated. */
function cloneTickState(s) {
  return {
    players: s.players.slice(),
    npcs: s.npcs.slice(),
    loots: s.loots.slice(),
  };
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
  const extraBufferMs = options.extraBufferMs ?? 0;
  const bufferMs = (1000 / serverFps) * bufferTicks + extraBufferMs;

  let timeOffset = -1;
  const vault = [];
  /** Authoritative merged tick state (delta ticks apply on top). */
  let lastMergedState = null;

  /** Hard resync only on large drift (tab sleep, reconnect); smooth small jitter from RTT spikes. */
  const CLOCK_HARD_RESYNC_MS = 400;
  const CLOCK_SMOOTH = 0.22;

  function insertSnapshotSorted(snapshot) {
    const t = snapshot.time;
    let lo = 0;
    let hi = vault.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (vault[mid].time <= t) lo = mid + 1;
      else hi = mid;
    }
    vault.splice(lo, 0, snapshot);
    while (vault.length > maxSnapshots) {
      vault.shift();
    }
  }

  function addSnapshot(snapshot) {
    if (!snapshot?.time) return;
    let expanded;
    if (snapshot.delta) {
      if (!lastMergedState) return;
      expanded = mergeTickDelta(lastMergedState, snapshot.state, snapshot.rm);
    } else {
      expanded = expandTickState(snapshot.state);
    }
    lastMergedState = cloneTickState(expanded);
    const normalized = { ...snapshot, state: expanded };

    const timeNow = Date.now();
    const ts = snapshot.time;
    if (timeOffset === -1) {
      timeOffset = timeNow - ts;
    } else {
      const o = timeNow - ts;
      const drift = o - timeOffset;
      if (Math.abs(drift) > CLOCK_HARD_RESYNC_MS) {
        timeOffset = o;
      } else {
        timeOffset += drift * CLOCK_SMOOTH;
      }
    }
    insertSnapshotSorted(normalized);
  }

  function seedFromHeroInit(expanded) {
    vault.length = 0;
    timeOffset = -1;
    lastMergedState = cloneTickState(expanded);
  }

  /**
   * Largest index i with vault[i].time <= serverTime (vault sorted ascending by time).
   */
  function rightmostLeq(serverTime) {
    let lo = -1;
    let hi = vault.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (vault[mid].time <= serverTime) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  /** Cap how far past the newest snapshot we're willing to extrapolate (≈ one buffer window). */
  const MAX_EXTRAPOLATION_MS = Math.max(bufferMs, (1000 / serverFps) * 2);

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
    if (serverTime < vault[0].time) return null;

    /**
     * Pick the segment [older, newer]. If serverTime is past the newest snapshot we reuse the
     * last segment and allow u > 1 (bounded extrapolation) — this hides single-packet drops
     * without letting entities fly off during long stalls.
     */
    let i = rightmostLeq(serverTime);
    let extrapolating = false;
    if (i < 0) return null;
    if (i >= vault.length - 1) {
      i = vault.length - 2;
      extrapolating = true;
    }

    const older = vault[i];
    const newer = vault[i + 1];
    const t0 = older.time;
    const t1 = newer.time;
    const dur = t1 - t0;
    if (dur <= 0) return null;

    let u = (serverTime - t0) / dur;
    if (extrapolating) {
      const maxU = 1 + MAX_EXTRAPOLATION_MS / dur;
      if (u > maxU) u = maxU;
      if (u < 0) u = 0;
    } else {
      if (u < 0) u = 0;
      else if (u > 1) u = 1;
    }

    /* Seconds — velocities are px/s (Phaser arcade), positions are px. */
    const dtSec = dur / 1000;

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

      /**
       * Fall back to linear if either end is a stop — Hermite tangents at v=0 turn into gentle
       * S-curves that can overshoot-then-settle on an axis-aligned stop, which reads as jitter.
       */
      const stopped = (vx0 === 0 && vy0 === 0) || (vx1 === 0 && vy1 === 0);

      let x;
      let y;
      if (stopped) {
        x = lerp(x0, x1, u);
        y = lerp(y0, y1, u);
      } else {
        /* Clamp tangent length so a single big delta can't cause Hermite overshoot. */
        const dx = x1 - x0;
        const dy = y1 - y0;
        const chord = Math.hypot(dx, dy);
        const tangentCap = Math.max(chord * 3, 1);
        const m0x = clampSigned(vx0 * dtSec, tangentCap);
        const m0y = clampSigned(vy0 * dtSec, tangentCap);
        const m1x = clampSigned(vx1 * dtSec, tangentCap);
        const m1y = clampSigned(vy1 * dtSec, tangentCap);
        x = hermite(x0, x1, m0x, m1x, u);
        y = hermite(y0, y1, m0y, m1y, u);
      }

      out.push({
        ...e1,
        x,
        y,
        vx: lerp(vx0, vx1, Math.min(1, u)),
        vy: lerp(vy0, vy1, Math.min(1, u)),
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

  function clampSigned(v, cap) {
    if (v > cap) return cap;
    if (v < -cap) return -cap;
    return v;
  }

  return { addSnapshot, interpolateEntityList, seedFromHeroInit };
}
