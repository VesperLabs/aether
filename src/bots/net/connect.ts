import { io } from "socket.io-client";
import type { ClientGameSocket } from "@/network/socket/game-socket";

/** How a bot logs in: `demoLogin` (dev servers) or a real account. */
export type BotLogin =
  | { kind: "demo"; charClass: string }
  | { kind: "account"; email: string; password: string };

/** Connects to `url`, logs in on every (re)connect, and reports what happens through `log`. */
export function connectBot(
  url: string,
  login: BotLogin,
  log: (message: string, ...rest: unknown[]) => void,
): ClientGameSocket {
  const socket: ClientGameSocket = io(url, { transports: ["websocket"], forceNew: true });
  socket.on("connect", () => {
    log("connected");
    if (login.kind === "demo") socket.emit("demoLogin", { charClass: login.charClass });
    else socket.emit("login", { email: login.email, password: login.password });
  });
  socket.on("disconnect", (reason) => log(`disconnected (${reason})`));
  socket.on("formError", (error) => log("login failed", error));
  return socket;
}
