import type { CharacterState } from "@/rules/character";
import { distanceTo } from "@/rules/world";
import { isMobile } from "@/ui/kit/is-mobile";
import type { Player } from "@/client/views/player";
import type { Sign } from "@/client/views/sign";
import type { NearbyPlayer, SceneMain } from "./main-scene";
import { reportNpcPlates } from "./npc-plates";

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
    // A Sign's `state` is Phaser's plain value, which has no lockedPlayerId.
    !(closestEntity?.state as CharacterState | undefined)?.lockedPlayerId
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
  let hovered: Player | undefined;
  let hoveredDistance = Infinity;
  /* Fighting the hero, with how far each is, to list the nearest first */
  const foes: { npc: Player; distance: number }[] = [];
  const companions: Player[] = [];
  const pointer = scene.input.activePointer;
  const cursorPoint = pointer.positionToCamera(scene.cameras.main) as Phaser.Math.Vector2;

  for (const entity of entities) {
    const distance = distanceTo(entity, hero);

    if (entity.kind === "player") {
      if (distance < PLAYER_CLOSEST_DISTANCE) {
        if (!(entity as Player).isHero) nearbyPlayers.push(entity as Player);
      }
    }

    if (entity?.kind === "sign" || (entity as Player)?.talks) {
      if (distance < closestDistance) {
        closestEntity = entity;
        closestDistance = distance;
      }
    }

    if (entity?.kind === "npc") {
      const cursorDistance = distanceTo(entity, cursorPoint);
      const npc = entity as Player;
      if (npc.state?.ownerId === hero.socketId && !npc.state.isDead) companions.push(npc);
      if (npc.state?.lockedPlayerId === hero.socketId && !npc.state.isDead) {
        foes.push({ npc, distance });
      }
      if (npc.state && !isMobile) {
        npc.state.isHovering =
          cursorDistance < (npc?.hitBoxSize?.width + npc?.hitBoxSize?.height) / 2;
        /* The plate shows the one nearest the cursor, if several are under it */
        if (npc.state.isHovering && !npc.state.isDead && cursorDistance < hoveredDistance) {
          hovered = npc;
          hoveredDistance = cursorDistance;
        }
      }
    }
  }
  foes.sort((a, b) => a.distance - b.distance);
  reportNpcPlates(
    companions,
    foes.map(({ npc }) => npc),
    hovered,
  );

  triggerEntityProximity(scene, closestEntity);
  triggerPlayerProximity(scene, nearbyPlayers);
}
