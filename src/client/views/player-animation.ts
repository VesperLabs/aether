import Phaser from "phaser";
import type { Player } from "./player";
import { getSwingWeaponAngle } from "./swing-arc";
import { isDodging } from "@/rules/movement";
import { getLayerOrder } from "@/content";

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
const OVERLAYS = ["userName", "buffRack", "stunStars", "bubble", "hpBar"] as const;

/** Stacks the rig's layers for the facing direction. Only reorders when the direction changes. */
function orderLayers(p: Player) {
  const isLeftShield = p.visibleEquipment?.handLeft?.type === "shield";
  const key = `${p.direction}:${isLeftShield}`;
  if (p.layerOrderKey === key) return;
  p.layerOrderKey = key;
  for (const layer of [...getLayerOrder(p.direction, isLeftShield), ...OVERLAYS])
    p.rig.bringToTop(p[layer]);
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
    action,
    visibleEquipment,
    profile,
    face,
    whiskers,
    hair,
  } = p;

  orderLayers(p);

  p?.playAnim(skin, [profile?.race, direction, action]);
  if (profile?.race === "human") {
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
  handRight.setTexture(visibleEquipment?.handRight?.texture);
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
  const { profile, handLeft, handRight, weaponAtlas: w, action } = player;
  const currentFrame = player?.skin?.anims?.currentFrame;
  const { left, right } = w?.offsets?.[profile?.race]?.[
    (currentFrame as Phaser.Animations.AnimationFrame).textureFrame
  ] || {
    left: undefined,
    right: undefined,
  };
  handLeft.setPosition(left?.x, left?.y);
  handLeft.setFlipX(!!left?.flipX);
  handLeft.setFlipY(!!left?.flipY);
  handLeft.setAngle(left?.rotation);
  handRight.setPosition(right?.x, right?.y);
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

  if (isLeftRanged) {
    if (action === "attack_left") aimBow(handLeft);
  }
}
