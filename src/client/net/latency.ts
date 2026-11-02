import type { ClientGameSocket } from "@/network";
import { netInterp } from "./scene-interpolation";

const PING_INTERVAL_MS = 2000;
/** How much each new sample moves the average. */
const SMOOTHING = 0.3;

let roundTripMs = 0;

/** Pings the server every few seconds, keeps a smoothed round-trip time and reports the view lag. */
export function trackLatency(socket: ClientGameSocket) {
  setInterval(() => {
    if (!socket.connected) return;
    const sentAt = performance.now();
    socket.emit("latency", () => {
      const sample = performance.now() - sentAt;
      roundTripMs = roundTripMs ? roundTripMs + (sample - roundTripMs) * SMOOTHING : sample;
      /* The server judges our hits by where others were when we saw them */
      socket.emit("reportLag", { ms: Math.round(getOneWayLatency() + netInterp.getDelay()) });
    });
  }, PING_INTERVAL_MS);
}

/** Roughly how long a server message takes to reach us, in ms. */
export function getOneWayLatency() {
  return roundTripMs / 2;
}
