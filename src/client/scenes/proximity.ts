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

/** Hover reaches at least this far from a body's middle each way, px, so small critters are easy to point at. */
const MIN_HOVER_HALF = 12;

/**
 * Is the cursor over the NPC: inside the box spells hit (where its body is drawn), grown to
 * `MIN_HOVER_HALF` for small ones. And how far the cursor is from that box's middle.
 */
function hoverOf(npc: Player, cursor: { x: number; y: number }) {
  const box = npc.hitBox;
  const x = npc.x + box.x;
  const y = npc.y + box.y;
  const halfWidth = Math.max(MIN_HOVER_HALF, box.displayWidth / 2);
  const halfHeight = Math.max(MIN_HOVER_HALF, box.displayHeight / 2);
  const dx = cursor.x - x;
  const dy = cursor.y - y;
  return {
    isOver: Math.abs(dx) <= halfWidth && Math.abs(dy) <= halfHeight,
    distance: Math.hypot(dx, dy),
  };
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
  const owned: Player[] = [];
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
      const npc = entity as Player;
      const hover = hoverOf(npc, cursorPoint);
      if (npc.state?.ownerId === hero.socketId && !npc.state.isDead) owned.push(npc);
      /* Fighting the hero, or hurt by them and still in combat (one that flees instead) */
      const isHurtByHero = npc.state?.hurtBy === hero.socketId && !npc.checkOutOfCombat();
      if ((npc.state?.lockedPlayerId === hero.socketId || isHurtByHero) && !npc.state.isDead) {
        foes.push({ npc, distance });
      }
      if (npc.state && !isMobile) {
        npc.state.isHovering = hover.isOver;
        /* The plate shows the one nearest the cursor, if several are under it */
        if (hover.isOver && !npc.state.isDead && hover.distance < hoveredDistance) {
          hovered = npc;
          hoveredDistance = hover.distance;
        }
      }
    }
  }
  foes.sort((a, b) => a.distance - b.distance);
  reportNpcPlates(
    /* Pets before followers */
    owned.sort((a, b) => Number(!!b.state.petId) - Number(!!a.state.petId)),
    foes.map(({ npc }) => npc),
    hovered,
  );

  triggerEntityProximity(scene, closestEntity);
  triggerPlayerProximity(scene, nearbyPlayers);
}
