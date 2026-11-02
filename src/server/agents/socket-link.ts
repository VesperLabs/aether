import { io as connect } from "socket.io-client";
import type { AgentLink } from "@/agents";
import type { ClientGameSocket } from "@/network";

/** socket.io's typed `on` can't take a generic message name; the link keeps the types. */
type LooseSocket = {
  on: (event: string, listener: (payload: unknown) => void) => void;
  off: (event: string, listener: (payload: unknown) => void) => void;
  emit: (event: string, ...args: unknown[]) => void;
};

/** An agent link over a real socket.io connection, exactly like the browser's. */
export async function connectSocketLink(url: string): Promise<AgentLink> {
  const socket: ClientGameSocket = connect(url, { transports: ["websocket"], forceNew: true });
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
  const loose = socket as unknown as LooseSocket;
  return {
    id: socket.id as string,
    send: (command, ...args) => loose.emit(command, ...args),
    on: (message, listener) => {
      const handler = listener as (payload: unknown) => void;
      loose.on(message, handler);
      return () => loose.off(message, handler);
    },
    close: () => socket.disconnect(),
  };
}
