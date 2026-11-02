import { io as connect } from "socket.io-client";
import type { BotLink } from "@/bots";
import type { ClientGameSocket } from "@/network";

/** A bot link over a real socket.io connection, exactly like the browser's. */
export async function connectSocketLink(url: string): Promise<BotLink> {
  const socket: ClientGameSocket = connect(url, { transports: ["websocket"], forceNew: true });
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
  /* socket.io's typed methods can't take a generic event name; BotLink's signature keeps the types */
  const untyped = socket as unknown as {
    on(event: string, listener: (payload: unknown) => void): void;
    off(event: string, listener: (payload: unknown) => void): void;
    emit(event: string, ...args: unknown[]): void;
  };
  return {
    id: socket.id ?? "",
    send: (command, ...args) => untyped.emit(command, ...args),
    on: (message, listener) => {
      const handler = listener as (payload: unknown) => void;
      untyped.on(message, handler);
      return () => untyped.off(message, handler);
    },
    close: () => socket.disconnect(),
  };
}
