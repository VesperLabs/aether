/** How often a session should ping, ms. */
export const PING_INTERVAL_MS = 2000;
/** How much each new sample moves the average. */
const SMOOTHING = 0.3;

/** The smoothed round trip after a new `sample`, both in ms; the first sample is taken whole. */
export function smoothRoundTrip(roundTripMs: number, sample: number) {
  return roundTripMs ? roundTripMs + (sample - roundTripMs) * SMOOTHING : sample;
}

/**
 * What to `reportLag`: how far behind the server this client sees others, so the server judges
 * its hits by where they were then. `viewDelayMs` is how far behind the latest poses it draws them.
 */
export function getLagReport(roundTripMs: number, viewDelayMs: number) {
  return { ms: Math.round(roundTripMs / 2 + viewDelayMs) };
}
