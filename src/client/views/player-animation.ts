import Phaser from "phaser";
import type { Player } from "./player";
import { BALL_SHEET } from "./ball-sheet";
import { heldBallFrame } from "./ball-in-hand";
import { WeaponSprite } from "./weapon-sprite";
import { aimedBowHand } from "./nocked-arrow";
import { getSwingWeaponAngle } from "./swing-arc";
import { getShownAction } from "@/rules/combat";
import { isDodging } from "@/rules/movement";
import { getBody, getFrameHands, getLayerOrder } from "@/content";

const BLANK_TEXTURE = "human-blank";

/** How long the red damage tint shows, in ms. A fixed time, so a long frame (a tab coming back) can't stretch it. */
const FLASH_MS = 70;

/** Where a drawn bow points along the aim: the crosshair's reticle, about 51px out (see crosshair.ts). */
const BOW_TARGET_DISTANCE = 51;

export function checkIsFlash(p: Player) {
  if (p.state.isFlash && Date.now() - p.state.lastFlash > FLASH_MS) {
    p.state.isFlash = false;
    p.drawCharacterFromUserData();
  }
}

/** Drawn over the body in every direction. */
const OVERLAYS = ["userName", "stunStars", "captureBall", "bubble", "hpBar"] as const;

/** A ball in the hand is drawn at the size it flies. */
const BALL_IN_HAND_SCALE = 0.5;

/** The hand holding a shot ready: a drawn bow, or a ball held out to throw. */
function heldShotHand(p: Player) {
  const bow = aimedBowHand(p);
  if (bow) return bow === p.handRight ? "handRight" : "handLeft";
  if (p.action === "attack_right" && heldBallFrame(p) !== undefined) return "handRight";
  return undefined;
}

/**
 * Stacks the rig's layers for the facing direction. Only reorders when that changes. Facing left
 * or right, a drawn bow goes over the body from the far hand (the left facing right, the right
 * facing left) and under it from the near hand. Facing up or down it keeps the direction's order.
 * A drawn bow's facing always comes from its aim (see hero-movement.ts), so the two agree.
 */
function orderLayers(p: Player) {
  const isLeftShield = p.visibleEquipment?.handLeft?.type === "shield";
  const bowHand = heldShotHand(p);
  const key = `${p.direction}:${isLeftShield}:${bowHand}`;
  if (p.layerOrderKey === key) return;
  p.layerOrderKey = key;
  for (const layer of [...getLayerOrder(p.direction, isLeftShield), ...OVERLAYS])
    p.rig.bringToTop(p[layer]);
  if (!bowHand || (p.direction !== "left" && p.direction !== "right")) return;
  if ((bowHand === "handLeft") === (p.direction === "right")) {
    p.rig.bringToTop(p[bowHand]);
    for (const layer of OVERLAYS) p.rig.bringToTop(p[layer]);
  } else {
    /* Just over the shadow, under everything else (`moveAbove` won't move what's already above) */
    p.rig.sendToBack(p[bowHand]);
    p.rig.sendToBack(p.shadow);
  }
}

export function drawFrame(p: Player) {
  const {
    skin,
    chest,
    armor,
    accessory,
    helmet,
    handLeft,
    handRight,
    pants,
    gloves,
    boots,
    shadow,
    direction,
    action: chosenAction,
    visibleEquipment,
    profile,
    face,
    whiskers,
    hair,
  } = p;
  /* An attack on a body without attack animations shows its standing frames */
  const action = getShownAction(profile?.race, chosenAction);

  orderLayers(p);

  p?.playAnim(skin, [profile?.race, direction, action]);
  if (getBody(profile?.race).layered) {
    p?.playAnim(chest, [profile?.race, profile?.gender, "chest-bare", direction, action]);
  } else {
    p?.playAnim(chest, [BLANK_TEXTURE, direction, action]);
  }
  p?.playAnim(shadow, ["shadow", direction, action]);
  p?.playAnim(face, [profile?.race, profile?.face?.texture, direction, action]);
  p?.playAnim(whiskers, [profile?.race, profile?.whiskers?.texture, direction, action]);
  p?.playAnim(hair, [profile?.race, profile?.hair?.texture, direction, action]);
  p?.playAnim(armor, [
    profile?.race,
    profile?.gender,
    visibleEquipment?.armor?.texture,
    direction,
    action,
  ]);
  p?.playAnim(helmet, [profile?.race, visibleEquipment?.helmet?.texture, direction, action]);
  p?.playAnim(boots, [profile?.race, visibleEquipment?.boots?.texture, direction, action]);
  p?.playAnim(gloves, [profile?.race, visibleEquipment?.gloves?.texture, direction, action]);
  p?.playAnim(pants, [profile?.race, visibleEquipment?.pants?.texture, direction, action]);
  p?.playAnim(accessory, [profile?.race, visibleEquipment?.accessory?.texture, direction, action]);
  playWeapons(p);
  /* Aiming a throw, the ball sits in the right hand in place of whatever it holds */
  const ballFrame = heldBallFrame(p);
  if (ballFrame === undefined) handRight.setTexture(visibleEquipment?.handRight?.texture);
  else handRight.setTexture(BALL_SHEET, ballFrame);
  handRight.setScale(ballFrame === undefined ? 1 : BALL_IN_HAND_SCALE);
  /* The ball isn't the weapon: it takes none of the weapon's glow */
  if (handRight instanceof WeaponSprite) handRight.setElementsHidden(ballFrame !== undefined);
  handLeft.setTexture(visibleEquipment?.handLeft?.texture);
}

export function updateCurrentSpeed(player: Player) {
  const vx = player.vx;
  const vy = player.vy;
  player.currentSpeed = Math.max(Math.abs(vx), Math.abs(vy));

  const canMoveRanged = player.isHero && player.hasRangedWeapon();

  /* A roll holds a walk frame (see player-dodge.ts), unless an attack is swinging out of it */
  if (isDodging(player.state, Date.now()) && !player.state.isAttacking) {
    player.action = "walk";
    return;
  }

  if (player.state.isAttacking && !canMoveRanged) {
    return;
  }

  /* A cast pose holds while standing; walking off right after shows the legs, like a bow */
  if (player.castPose && Date.now() < player.castPose.until && player.currentSpeed === 0) {
    player.action = player.castPose.action;
    return;
  }

  // for bows
  if (player.state.isHoldingAttack) {
    if (player.hasRangedWeaponLeft()) player.action = "attack_left";
    if (player.hasRangedWeaponRight()) player.action = "attack_right";
    if (player.hasRangedWeapon()) return;
  }

  /* A ball aimed to throw is held out in the right hand, drawn like a bow */
  if (heldBallFrame(player) !== undefined) {
    player.action = "attack_right";
    return;
  }

  if (player.state.isAiming) {
    player.action = "stand";
    return;
  }

  player.action = player.currentSpeed === 0 ? "stand" : "walk";
}

export function approachAlpha(currentAlpha: number, targetAlpha: number, step: number) {
  const difference = Math.abs(targetAlpha - currentAlpha);

  if (difference <= step) {
    return targetAlpha;
  } else if (currentAlpha < targetAlpha) {
    return currentAlpha + step;
  } else {
    return currentAlpha - step;
  }
}

export function hackFrameRates(player: Player, rate: number) {
  const spriteKeys = [
    "shadow",
    "chest",
    "skin",
    "face",
    "whiskers",
    "hair",
    "accessory",
    "armor",
    "boots",
    "gloves",
    "pants",
    "helmet",
  ] as const;
  for (const spriteKey of spriteKeys) {
    player[spriteKey].anims.msPerFrame = player?.state?.isAttacking ? 100 : rate;
  }
}

function playWeapons(player: Player) {
  const { profile, handLeft, handRight, action } = player;
  const currentFrame = player?.skin?.anims?.currentFrame as Phaser.Animations.AnimationFrame;
  const { left, right } = getFrameHands(profile?.race, String(currentFrame?.textureFrame)) ?? {};
  /* Hand points are drawn for a body at scale 1, so a bigger body holds farther out */
  const scale = profile?.scale || 1;
  handLeft.setPosition(left && left.x * scale, left && left.y * scale);
  handLeft.setFlipX(!!left?.flipX);
  handLeft.setFlipY(!!left?.flipY);
  handLeft.setAngle(left?.rotation);
  handRight.setPosition(right && right.x * scale, right && right.y * scale);
  handRight.setFlipX(!!right?.flipX);
  handRight.setFlipY(!!right?.flipY);
  handRight.setAngle(right?.rotation);

  const bowAngleOffset = Phaser.Math.DegToRad(-135);
  /* A drawn bow stays in the hand and turns there to point at the reticle, where the arrow goes */
  const aimBow = (hand: Player["handLeft"]) => {
    const angle = player.state.lastAngle ?? 0;
    const target = {
      x: Math.cos(angle) * BOW_TARGET_DISTANCE,
      y: player.bodyOffsetY + Math.sin(angle) * BOW_TARGET_DISTANCE,
    };
    const fromHand = Math.atan2(
      target.y - (player.rig.y + hand.y),
      target.x - (player.rig.x + hand.x),
    );
    hand.setFlipY(false);
    hand.setFlipX(false);
    hand.setRotation(fromHand + bowAngleOffset);
  };
  const isRightRanged = player.hasRangedWeaponRight();
  const isLeftRanged = player.hasRangedWeaponLeft();

  /* A melee swing turns the weapon with its blade, in the hand and flips the attack frame gave it */
  for (const hand of ["handLeft", "handRight"] as const) {
    const pose = hand === "handLeft" ? left : right;
    const angle = pose
      ? getSwingWeaponAngle(player, hand, pose, action.startsWith("attack"))
      : undefined;
    if (angle === undefined) continue;
    player[hand].setAngle(angle);
  }

  if (isRightRanged) {
    if (action === "attack_right") aimBow(handRight);
  }

  /* A held-out ball sits upright in the hand */
  if (action === "attack_right" && heldBallFrame(player) !== undefined) {
    handRight.setFlipX(false);
    handRight.setFlipY(false);
    handRight.setRotation(0);
  }

  if (isLeftRanged) {
    if (action === "attack_left") aimBow(handLeft);
  }
}
