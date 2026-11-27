import { getNpc } from "@/client/scenes/scene-entities";
import type { SceneMain } from "@/client/scenes/main-scene";
import { playLeaveDissolve, playSpawnDissolve } from "@/client/views/dissolve";
import type { ServerToClientEvents } from "@/network";

type RespawnNpc = Parameters<ServerToClientEvents["respawnNpc"]>[0];

/**
 * Comings and goings for NPCs the room doesn't have yet: it is still loading its art, to be built
 * from a snapshot taken before them. Replayed once it's built, so a butterfly that left meanwhile
 * isn't left standing frozen. The latest per NPC wins.
 */
const backlog = new Map<string, () => void>();

/** A new room snapshot has arrived: anything before it is already in it. */
export function startNpcBacklog() {
  backlog.clear();
}

/** The room is built: plays what happened to its NPCs while it loaded. */
export function replayNpcBacklog() {
  const pending = [...backlog.values()];
  backlog.clear();
  for (const replay of pending) replay();
}

function respawnNpc(scene: SceneMain, message: RespawnNpc) {
  const { id, x, y, respawnTime } = message;
  const npc = getNpc(scene, id);
  if (!npc) return backlog.set(id, () => respawnNpc(scene, message));
  //interpolation will ignore snapshots prior. (Won't fly across screen)
  npc.state.lastTeleport = respawnTime;
  npc.setPosition(x, y);
  npc.respawn();
  playSpawnDissolve(npc);
}

/* Gone for a while (a butterfly at dusk, or in the rain): it dissolves away, then hides as the dead
 * do until `respawnNpc` brings it back */
function sendNpcAway(scene: SceneMain, id: string) {
  const npc = getNpc(scene, id);
  if (!npc) return backlog.set(id, () => sendNpcAway(scene, id));
  playLeaveDissolve(npc);
  npc.doDeath();
}

/** NPCs coming and going: respawning, warping to their owner, and leaving for a while. */
export function bindNpcSocket(scene: SceneMain) {
  const { socket } = scene;

  socket.on("respawnNpc", (message) => respawnNpc(scene, message));

  /* Left far behind, it dissolves away where it was and back in beside its owner */
  socket.on("warpNpc", ({ id, x, y, warpTime }) => {
    const npc = getNpc(scene, id);
    if (!npc) return;
    playLeaveDissolve(npc);
    npc.state.lastTeleport = warpTime;
    npc.setPosition(x, y);
    playSpawnDissolve(npc);
  });

  socket.on("npcAway", ({ id }) => sendNpcAway(scene, id));
}
