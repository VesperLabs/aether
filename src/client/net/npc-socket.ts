import { getNpc } from "@/client/scenes/scene-entities";
import type { SceneMain } from "@/client/scenes/main-scene";
import { playLeaveDissolve, playSpawnDissolve } from "@/client/views/dissolve";

/** NPCs coming and going: respawning, warping to their owner, and leaving for a while. */
export function bindNpcSocket(scene: SceneMain) {
  const { socket } = scene;

  socket.on("respawnNpc", ({ id, x, y, respawnTime }) => {
    const npc = getNpc(scene, id);
    if (!npc) return;
    //interpolation will ignore snapshots prior. (Won't fly across screen)
    npc.state.lastTeleport = respawnTime;
    npc.setPosition(x, y);
    npc?.respawn();
    playSpawnDissolve(npc);
  });

  /* Left far behind, it dissolves away where it was and back in beside its owner */
  socket.on("warpNpc", ({ id, x, y, warpTime }) => {
    const npc = getNpc(scene, id);
    if (!npc) return;
    playLeaveDissolve(npc);
    npc.state.lastTeleport = warpTime;
    npc.setPosition(x, y);
    playSpawnDissolve(npc);
  });

  /* Gone for a while (a butterfly at dusk): it dissolves away, then hides as the dead do until
   * `respawnNpc` brings it back */
  socket.on("npcAway", ({ id }) => {
    const npc = getNpc(scene, id);
    if (!npc) return;
    playLeaveDissolve(npc);
    npc.doDeath();
  });
}
