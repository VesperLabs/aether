import Phaser from "phaser";
import type { Point } from "@/rules/world";
import { getAbilityCosts, hasStaminaFor } from "@/rules/combat";
import type { Player } from "./player";

/**
 * Nocking: the arrow fades in on the string over `NOCK_MS`. After a shot it nocks while the bow
 * recovers, landing as the next shot is ready, so the animation never holds a shot back. Holding
 * then pulls the string over `DRAW_MS`.
 */
const NOCK_MS = 90;
const DRAW_MS = 160;
/** Where the arrow sits along the bow from the bow hand, px: resting on the string, then fully drawn. */
const REST_OFFSET = 4;
const DRAWN_OFFSET = -3;
/** After a shot, how long the bow stays readied for the next one before the arrow is put away, ms. */
const READY_LINGER_MS = 600;
/** The bow art's turn from the way it points (see `aimBow` in player-animation.ts). */
const BOW_TURN = Phaser.Math.DegToRad(-135);
/** Icon art points up and to the right. */
const ICON_TURN = Math.PI / 4;

interface Nock {
  arrow: Phaser.GameObjects.Sprite;
  /** When this arrow started swinging onto the string. */
  nockedAt?: number;
  /** When the current hold began, to pull the string from. */
  heldAt?: number;
  /** When the last arrow left, so the next one readies even between taps. */
  shotAt?: number;
}

const nocks = new WeakMap<Player, Nock>();

/** The arrow for a player, made the first time it draws a bow. */
function nockOf(player: Player) {
  let nock = nocks.get(player);
  if (!nock) {
    const arrow = player.scene.add.sprite(0, 0, "icons", "arrow").setVisible(false);
    player.rig.add(arrow);
    player.once(Phaser.GameObjects.Events.DESTROY, () => arrow.destroy());
    nock = { arrow };
    nocks.set(player, nock);
  }
  return nock;
}

/**
 * The hand holding a bow turned to aim, if the body is in that pose. Only then does the arrow lie
 * along the bow; in any other pose the bow is held loose and no arrow shows.
 */
function aimedBowHand(player: Player) {
  if (player.action === "attack_right" && player.hasRangedWeaponRight()) return player.handRight;
  if (player.action === "attack_left" && player.hasRangedWeaponLeft()) return player.handLeft;
  return undefined;
}

/** For the hero, whose stats we know: is there SP for the next shot? Others always have it. */
function hasStaminaToShoot(player: Player) {
  if (!player.isHero) return true;
  const { lastAttackCount, lastAbilitySlot } = player.state;
  const { stats } = player.getAttackActionName({
    count: lastAttackCount ?? 1,
    abilitySlot: lastAbilitySlot,
  });
  return hasStaminaFor(player.stats?.sp, getAbilityCosts(stats).sp);
}

/**
 * Takes the arrow off the string as its shot leaves: where it was in the world, so the shot can be
 * drawn leaving from there. Nothing when no arrow is nocked.
 */
export function takeNockedArrow(player: Player): Point | undefined {
  const nock = nocks.get(player);
  if (!nock) return undefined;
  nock.shotAt = player.scene.time.now;
  nock.heldAt = undefined;
  const wasNocked = nock.arrow.visible && nock.nockedAt !== undefined;
  nock.nockedAt = undefined;
  if (!wasNocked) return undefined;
  const { tx: x, ty: y } = nock.arrow.getWorldTransformMatrix();
  nock.arrow.setVisible(false);
  return { x, y };
}

/** Puts `item` right over `base` in the container. (`moveAbove` won't move what's already above.) */
function placeJustAbove(
  container: Phaser.GameObjects.Container,
  item: Phaser.GameObjects.GameObject,
  base: Phaser.GameObjects.GameObject,
) {
  const at = container.getIndex(item);
  const baseAt = container.getIndex(base);
  if (at === baseAt + 1) return;
  /* Taking it out first shifts the base down a place when it was under the base */
  container.moveTo(item, at < baseAt ? baseAt : baseAt + 1);
}

function hide(nock: Nock) {
  nock.nockedAt = undefined;
  nock.heldAt = undefined;
  nock.arrow.setVisible(false);
}

/**
 * Shows an arrow on a bow being used: nocked as the next shot comes ready (while held, or between
 * quick shots), pulled back while the attack is held, and taken by the shot when it's loosed.
 */
export function updateNockedArrow(player: Player) {
  const hand = aimedBowHand(player);
  if (!hand && !nocks.has(player)) return;
  const nock = nockOf(player);
  const { arrow } = nock;
  const now = player.scene.time.now;
  const drawing = !!hand && player.state.isHoldingAttack;
  const recentlyShot = nock.shotAt !== undefined && now - nock.shotAt < READY_LINGER_MS;
  if (!hand || player.state.isDead || (!drawing && !recentlyShot) || !hasStaminaToShoot(player)) {
    if (!recentlyShot) nock.shotAt = undefined;
    return hide(nock);
  }
  if (drawing) {
    nock.heldAt ??= now;
    /* Holding keeps the bow readied however long the aim takes */
    if (nock.shotAt !== undefined) nock.shotAt = now;
  } else {
    nock.heldAt = undefined;
  }

  /* Nock so the arrow settles on the string just as the bow has recovered */
  if (nock.nockedAt === undefined) {
    const { timeRemaining } = player.checkAttackReady();
    if (timeRemaining > NOCK_MS) return hide(nock);
    nock.nockedAt = now;
    arrow.setVisible(true).setAlpha(0);
  }

  const sinceNock = now - nock.nockedAt;
  const pullFrom = Math.max(nock.nockedAt + NOCK_MS, nock.heldAt ?? Infinity);
  const pull = Phaser.Math.Easing.Quadratic.Out(
    Phaser.Math.Clamp((now - pullFrom) / DRAW_MS, 0, 1),
  );
  const along = Phaser.Math.Linear(REST_OFFSET, DRAWN_OFFSET, pull);
  /* Along the bow as it's turned in the hand, which points at the reticle */
  const angle = hand.rotation - BOW_TURN;
  arrow.setPosition(hand.x + Math.cos(angle) * along, hand.y + Math.sin(angle) * along);
  arrow.setRotation(angle + ICON_TURN);
  arrow.setAlpha(Math.min(1, sinceNock / NOCK_MS));
  /* Just over the bow, whichever way the body faces */
  placeJustAbove(player.rig, arrow, hand);
}
