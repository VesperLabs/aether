import type { ServerWorld } from "@/server/world/server-world";
import type { GameSocket } from "@/network/socket/game-socket";
import { savePlayer } from "@/server/persistence/save-player";
import { removePlayer } from "@/server/world/remove-player";
import { legacyLeaveParty } from "@/server/party/party-adapter";
import type { CommandContext } from "./command-context";
import { registerCommands } from "./dispatcher";
import { commandHandlers } from "./handlers/command-handlers";

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

    socket.on("disconnect", async () => {
      const { socketId } = ctx;
      const player = world.players?.[socketId];
      /* A socket that never logged in has nobody to save, and `close` already saved everyone. */
      const saved = player && !world.closing ? savePlayer(world, player) : undefined;
      world.log.info(`🔌 ${player?.profile?.userName ?? "Anonymous"} disconnected`);
      legacyLeaveParty(world, socketId, socket);
      removePlayer(world, socketId);
      world.io.emit("remove", socketId);
      /* The save is tracked, so shutdown waits for it. */
      await saved;
    });
  });
}
