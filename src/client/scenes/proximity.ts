import { distanceTo } from "@/shared/rules/world";
import { isMobile } from "@/ui/is-mobile";

function triggerPlayerProximity(scene, nearbyPlayers) {
  const next = nearbyPlayers
    .map((player) => ({
      socketId: player.socketId,
      peerId: player.peerId || null,
    }))
    .filter((x) => x.socketId);

  const prev = scene.nearbyRemotePlayers || [];
  const sameSocket = (a, b) => a.socketId === b.socketId;

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

function triggerEntityProximity(scene, closestEntity) {
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

export function checkProximities(scene, time) {
  const { hero } = scene ?? {};
  if (time % 8 > 1) return;
  if (!hero) return;

  const entities = [
    ...scene.npcs.getChildren(),
    ...scene.signs.getChildren(),
    ...scene.players.getChildren(),
  ];

  let closestEntity;
  let closestDistance = 80;
  let PLAYER_CLOSEST_DISTANCE = 200;

  let nearbyPlayers = [];
  const pointer = scene.input.activePointer;
  const cursorPoint = pointer.positionToCamera(scene.cameras.main);

  for (const entity of entities) {
    const distance = distanceTo(entity, hero);

    if (entity.kind === "player") {
      if (distance < PLAYER_CLOSEST_DISTANCE) {
        if (!entity.isHero) nearbyPlayers.push(entity);
      }
    }

    if (["sign", "keeper"]?.includes(entity?.kind)) {
      if (distance < closestDistance) {
        closestEntity = entity;
        closestDistance = distance;
      }
    }

    if (entity.kind !== "sign") {
      entity.checkStealth({ distance });
    }

    if (["nasty", "keeper"]?.includes(entity?.kind)) {
      const cursorDistance = distanceTo(entity, cursorPoint);
      if (entity.state && !isMobile) {
        entity.state.isHovering =
          cursorDistance < (entity?.hitBoxSize?.width + entity?.hitBoxSize?.height) / 2;
      }
    }
  }

  triggerEntityProximity(scene, closestEntity);
  triggerPlayerProximity(scene, nearbyPlayers);
}
