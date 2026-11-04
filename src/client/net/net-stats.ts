import type { ServerHealthMessage } from "@/network";

/** How far back the panel looks. */
const WINDOW_MS = 10_000;

interface Sample {
  at: number;
  ms: number;
}

const poseGaps: Sample[] = [];
const roundTrips: Sample[] = [];
let lastPoseAt = 0;
let serverHealth: ServerHealthMessage | undefined;

const trim = (samples: Sample[], now: number) => {
  while (samples[0] && now - samples[0].at > WINDOW_MS) samples.shift();
};

/** Call when a pose snapshot arrives. The gaps between them are what lag feels like. */
export function recordPoseArrival(now: number) {
  if (lastPoseAt) poseGaps.push({ at: now, ms: now - lastPoseAt });
  lastPoseAt = now;
  trim(poseGaps, now);
}

/** Forget the last arrival, so a reconnect or map change doesn't read as one long gap. */
export function resetPoseArrivals() {
  lastPoseAt = 0;
}

export function recordRoundTrip(now: number, ms: number, health?: ServerHealthMessage) {
  roundTrips.push({ at: now, ms });
  trim(roundTrips, now);
  if (health) serverHealth = health;
}

const percentile = (values: number[], p: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

/** Summary of the last 10 seconds, plus the raw snapshot gaps for a graph. */
export function readNetStats(now: number) {
  trim(poseGaps, now);
  trim(roundTrips, now);
  const gaps = poseGaps.map((s) => s.ms);
  const rtts = roundTrips.map((s) => s.ms);
  return {
    gaps,
    gapP95: percentile(gaps, 95),
    gapMax: Math.max(0, ...gaps),
    rttLast: rtts.at(-1) ?? 0,
    rttP50: percentile(rtts, 50),
    rttP95: percentile(rtts, 95),
    rttMax: Math.max(0, ...rtts),
    server: serverHealth,
  };
}

export type NetStats = ReturnType<typeof readNetStats>;
