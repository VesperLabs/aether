import type { GameSocket } from "@/shared/network";
import { removePlayer } from "../remove-player";
import { legacyLeaveParty } from "../party-adapter";
import type { CommandContext } from "./command-context";
import { registerCommands } from "./dispatcher";
import { commandHandlers } from "./handlers/command-handlers";
import { shouldPause } from "./scene-pause";

/** Wires every new socket to the command dispatcher and cleans up when it goes away. */
export function listenForConnections(scene: ServerScene) {
  scene.io.on("connection", (socket: GameSocket) => {
    const ctx: CommandContext = {
      scene,
      io: scene.io,
      socket,
      socketId: socket.id,
      session: { peerId: null },
    };

    registerCommands(ctx, commandHandlers);

    socket.on("disconnect", () => {
      const { socketId } = ctx;
      const player = scene.players?.[socketId];
      scene.db.updateUser(scene.players?.[socketId]);
      console.log(`🔌 ${player?.profile?.userName ?? "Anonymous"} disconnected`);
      legacyLeaveParty(scene, socket);
      removePlayer(scene, socketId);
      scene.io.emit("remove", socketId);
      /* Should we pause or resume? */
      shouldPause(scene);
    });
  });
}
