import socketIOClient from "socket.io-client";
import type { ClientGameSocket } from "@/network";

const SERVER_URL = process.env.SERVER_URL as string;

/** WebSocket only, no polling (no long-poll fallback). */
export function createGameSocket(): ClientGameSocket {
  return socketIOClient(SERVER_URL, { transports: ["websocket"] });
}

/** Keeps trying to reconnect when the connection drops. */
export function keepSocketConnected(socket: ClientGameSocket) {
  setInterval(() => {
    if (socket.connected) return;
    socket.connect();
  }, 3000);
}
