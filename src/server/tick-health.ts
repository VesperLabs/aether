import { monitorEventLoopDelay, performance } from "node:perf_hooks";
import type { ServerHealthMessage } from "@/network";
import type { System } from "@/rules/world";
import type { ServerWorld } from "./server-world";

/** How far back the reported maximums look. */
const WINDOW_MS = 5000;
const NS_PER_MS = 1e6;

interface TickSample {
  at: number;
  gap: number;
  work: number;
}

/** Wall-clock timings of the tick loop and the event loop, for spotting server stalls. */
export interface TickHealth {
  /** The tick interval the loop aims for, ms. */
  targetTickMs: number;
  startedAt: number;
  samples: TickSample[];
  loopDelay: ReturnType<typeof monitorEventLoopDelay>;
  /** The previous window's event loop delay, so a fresh reset doesn't read as zero. */
  lastLoopDelay: { p99: number; max: number; at: number };
}

export function createTickHealth(targetTickMs: number): TickHealth {
  const loopDelay = monitorEventLoopDelay({ resolution: 10 });
  loopDelay.enable();
  return {
    targetTickMs,
    startedAt: 0,
    samples: [],
    loopDelay,
    lastLoopDelay: { p99: 0, max: 0, at: performance.now() },
  };
}

/** Runs first each tick. */
export const startTickTimer: System<ServerWorld> = (world) => {
  world.tickHealth.startedAt = performance.now();
};

/** Runs last each tick: records how long the tick waited and worked. */
export const endTickTimer: System<ServerWorld> = (world, { delta }) => {
  const health = world.tickHealth;
  const at = performance.now();
  health.samples.push({ at, gap: delta, work: at - health.startedAt });
  while (health.samples[0] && at - health.samples[0].at > WINDOW_MS) health.samples.shift();
};

/** The last few seconds of tick and event loop timings. */
export function readTickHealth(world: ServerWorld): ServerHealthMessage {
  const health = world.tickHealth;
  const now = performance.now();
  const { loopDelay, lastLoopDelay } = health;
  /* Roll the histogram once a window, keeping the closed window's numbers */
  if (now - lastLoopDelay.at > WINDOW_MS) {
    health.lastLoopDelay = {
      p99: loopDelay.percentile(99) / NS_PER_MS,
      max: loopDelay.max / NS_PER_MS,
      at: now,
    };
    loopDelay.reset();
  }
  const current = { p99: loopDelay.percentile(99) / NS_PER_MS, max: loopDelay.max / NS_PER_MS };
  const recent = health.samples.filter((s) => now - s.at <= WINDOW_MS);
  return {
    targetTickMs: health.targetTickMs,
    maxTickGapMs: Math.round(Math.max(0, ...recent.map((s) => s.gap))),
    maxTickWorkMs: Math.round(Math.max(0, ...recent.map((s) => s.work)) * 10) / 10,
    loopDelayP99Ms: Math.round(Math.max(current.p99, health.lastLoopDelay.p99)),
    loopDelayMaxMs: Math.round(Math.max(current.max, health.lastLoopDelay.max)),
    playersOnline: Object.keys(world.players).length,
    upTimeMs: Math.round(process.uptime() * 1000),
  };
}
