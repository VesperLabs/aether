import type { ServerWorld } from "../server-world";
import type { GameSocket } from "@/shared/network";
import { removePlayer } from "../remove-player";
import { legacyLeaveParty } from "../party-adapter";
import type { CommandContext } from "./command-context";
import { registerCommands } from "./dispatcher";
import { commandHandlers } from "./handlers/command-handlers";
import { shouldPause } from "./world-pause";

/** Wires every new socket to the command dispatcher and cleans up when it goes away. */
export function listenForConnections(world: ServerWorld) {
  world.io.on("connection", (socket: GameSocket) => {
    const ctx: CommandContext = {
      world,
      io: world.io,
      socket,
      socketId: socket.id,
      session: { peerId: null },
    };

    registerCommands(ctx, commandHandlers);

    socket.on("disconnect", () => {
      const { socketId } = ctx;
      const player = world.players?.[socketId];
      world.db.updateUser(world.players?.[socketId]);
      console.log(`🔌 ${player?.profile?.userName ?? "Anonymous"} disconnected`);
      legacyLeaveParty(world, socketId, socket);
      removePlayer(world, socketId);
      world.io.emit("remove", socketId);
      /* Should we pause or resume? */
      shouldPause(world);
    });
  });
}
