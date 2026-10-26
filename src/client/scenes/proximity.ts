import { distanceTo } from "@/shared/rules/world";
import { isMobile } from "@/ui/is-mobile";
import type { Player } from "@/client/views/player";
import type { Sign } from "@/client/views/sign";
import type { NearbyPlayer, SceneMain } from "./main-scene";

/** What the hero can walk up to: a keeper (or other character) or a sign. */
type Entity = Player | Sign;


function triggerPlayerProximity(scene: SceneMain, nearbyPlayers: Player[]) {
  const next: NearbyPlayer[] = nearbyPlayers
    .map((player) => ({
      socketId: player.socketId,
      peerId: player.peerId || null,
    }))
    .filter((x) => x.socketId) as NearbyPlayer[];

  const prev = scene.nearbyRemotePlayers || [];
  const sameSocket = (a: NearbyPlayer, b: NearbyPlayer) => a.socketId === b.socketId;

  for (const n of next) {
    if (!prev.some((p) => sameSocket(p, n))) {
      window.dispatchEvent(
        new CustomEvent("HERO_NEAR_PLAYER", { detail: { socketId: n.socketId, peerId: n.peerId } }),
      );
    }
  }
  for (const p of prev) {
    if (!next.some((n) => sameSocket(n, p))) {
      window.dispatchEvent(
        new CustomEvent("HERO_AWAY_PLAYER", { detail: { socketId: p.socketId, peerId: p.peerId } }),
      );
    }
  }
  scene.nearbyRemotePlayers = next;
}

function triggerEntityProximity(scene: SceneMain, closestEntity: Entity | undefined) {
  const { hero } = scene ?? {};
  if (
    closestEntity &&
    hero.state.targetNpcId !== closestEntity?.id &&
    !closestEntity?.state?.lockedPlayerId
  ) {
    hero.state.targetNpcId = closestEntity?.id;
    window.dispatchEvent(new CustomEvent("HERO_NEAR_NPC", { detail: closestEntity?.id }));
  } else if (!closestEntity && hero.state.targetNpcId) {
    hero.state.targetNpcId = null;
    window.dispatchEvent(new CustomEvent("HERO_NEAR_NPC", { detail: null }));
  }
}

export function checkProximities(scene: SceneMain, time: number) {
  const { hero } = scene ?? {};
  if (time % 8 > 1) return;
  if (!hero) return;

  const entities = [
    ...scene.npcs.getChildren(),
    ...scene.signs.getChildren(),
    ...scene.players.getChildren(),
  ] as Entity[];

  let closestEntity: Entity | undefined;
  let closestDistance = 80;
  let PLAYER_CLOSEST_DISTANCE = 200;

  const nearbyPlayers: Player[] = [];
  const pointer = scene.input.activePointer;
  const cursorPoint = pointer.positionToCamera(scene.cameras.main) as Phaser.Math.Vector2;

  for (const entity of entities) {
    const distance = distanceTo(entity, hero);

    if (entity.kind === "player") {
      if (distance < PLAYER_CLOSEST_DISTANCE) {
        if (!(entity as Player).isHero) nearbyPlayers.push(entity as Player);
      }
    }

    if (["sign", "keeper"]?.includes(entity?.kind)) {
      if (distance < closestDistance) {
        closestEntity = entity;
        closestDistance = distance;
      }
    }

    if (entity.kind !== "sign") {
      (entity as Player).checkStealth({ distance });
    }

    if (["nasty", "keeper"]?.includes(entity?.kind)) {
      const cursorDistance = distanceTo(entity, cursorPoint);
      const npc = entity as Player;
      if (npc.state && !isMobile) {
        npc.state.isHovering =
          cursorDistance < (npc?.hitBoxSize?.width + npc?.hitBoxSize?.height) / 2;
      }
    }
  }

  triggerEntityProximity(scene, closestEntity);
  triggerPlayerProximity(scene, nearbyPlayers);
}
