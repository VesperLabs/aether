import type { SceneMain } from "@/client/scenes/main-scene";
import { cancelPendingRooms } from "@/client/scenes/enter-room";
import { resetEntities } from "@/client/scenes/scene-entities";
import { hideWorld } from "@/client/scenes/world-reveal";
import { startObserverTour } from "@/client/scenes/observer-tour";
import { netInterp } from "./scene-interpolation";
import type { Player } from "@/client/views/player";

/**
 * Keeps the world behind the login screen live across reconnects. A dropped connection (a server
 * restart) logs the player out; the old room is cleared at once, and any room still loading is
 * dropped, since nothing will ever update them again and they would linger frozen. Every
 * connection then tours rooms until it logs in, except the first of a page that arrived with a
 * login ticket: its own room is next.
 */
export function bindConnectionSocket(scene: SceneMain) {
  const { socket } = scene;
  /* Read now: the scene spends the ticket next */
  let isRedeeming = !!scene.ticket;
  const tourIfLoggedOut = () => {
    if (isRedeeming) {
      isRedeeming = false;
      return;
    }
    startObserverTour(scene);
  };
  socket.on("connect", tourIfLoggedOut);
  if (socket.connected) tourIfLoggedOut();

  socket.on("disconnect", () => {
    cancelPendingRooms();
    hideWorld(scene);
    resetEntities(scene);
    scene.hero = undefined as unknown as Player;
    netInterp.reset();
  });
}
