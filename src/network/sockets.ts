import type { Server, Socket } from "socket.io";
import type { Socket as ClientSocket } from "socket.io-client";
import type { ClientToServerEvents } from "./commands";
import type { ServerToClientEvents } from "./messages";

/** The Socket.IO server, typed with the commands it accepts and the messages it sends. */
export type GameIo = Server<ClientToServerEvents, ServerToClientEvents>;

/** One connected client, as the server sees it. */
export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** The server connection, as the client sees it. */
export type ClientGameSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;
