import type { ClientGameSocket } from "@/network/socket/game-socket";
import type { HeroSession } from "@/network/session/hero/hero-session";
import { PING_INTERVAL_MS } from "@/network/session/hero/latency";

let session: HeroSession | undefined;

/** Pings the server every few seconds through the hero session, which reports the lag it sees. */
export function trackLatency(socket: ClientGameSocket, heroSession: HeroSession) {
  session = heroSession;
  setInterval(() => {
    if (socket.connected) heroSession.ping();
  }, PING_INTERVAL_MS);
}

/** Roughly how long a server message takes to reach us, in ms. */
export function getOneWayLatency() {
  return (session?.roundTrip() ?? 0) / 2;
}
