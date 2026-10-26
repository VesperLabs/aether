import Phaser from "phaser";

const BLANK_TEXTURE = "human-blank";

export function checkIsFlash(p, delta) {
  /* Let us attack again when it is ready */
  if (Date.now() - p.state.lastFlash > delta + 50 && p.state.isFlash) {
    p.state.isFlash = false;
    p.drawCharacterFromUserData();
  }
}

export function drawFrame(p) {
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
    bubble,
    hpBar,
    userName,
    talkMenu,
  } = p;

  /* Depth sort based on direction */

  p.bringToTop(skin);
  p.bringToTop(hair);
  p.bringToTop(helmet);
  p.bringToTop(chest);
  p.bringToTop(pants);
  p.bringToTop(boots);
  p.bringToTop(gloves);
  p.bringToTop(armor);

  if (direction === "up") {
    p.bringToTop(accessory);
    p.bringToTop(hair);
    p.bringToTop(face);
    p.bringToTop(whiskers);
    p.bringToTop(helmet);
    p.sendToBack(handLeft);
    p.sendToBack(handRight);
  } else if (direction === "down") {
    p.bringToTop(chest);
    p.bringToTop(armor);
    p.bringToTop(gloves);
    p.bringToTop(face);
    p.bringToTop(whiskers);
    p.bringToTop(accessory);
    p.bringToTop(helmet);
    p.bringToTop(handRight);
    p.bringToTop(handLeft);
  } else if (direction === "left") {
    p.bringToTop(chest);
    p.bringToTop(armor);
    p.bringToTop(hair);
    p.bringToTop(face);
    p.bringToTop(whiskers);
    p.bringToTop(accessory);
    p.bringToTop(helmet);
    p.bringToTop(gloves);
    p.bringToTop(handLeft);
    p.sendToBack(handRight);
  } else if (direction === "right") {
    p.bringToTop(chest);
    p.bringToTop(armor);
    p.bringToTop(hair);
    p.bringToTop(face);
    p.bringToTop(whiskers);
    p.bringToTop(accessory);
    p.bringToTop(helmet);
    p.bringToTop(gloves);
    p.sendToBack(handLeft);
    p.bringToTop(handRight);
  }

  p.bringToTop(userName);
  p.bringToTop(bubble);
  p.bringToTop(hpBar);
  p.bringToTop(talkMenu);

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
  p?.playAnim(
    armor,
    [profile?.race, profile?.gender, visibleEquipment?.armor?.texture, direction, action],
    p.isHero,
  );
  p?.playAnim(helmet, [profile?.race, visibleEquipment?.helmet?.texture, direction, action]);
  p?.playAnim(boots, [profile?.race, visibleEquipment?.boots?.texture, direction, action]);
  p?.playAnim(gloves, [profile?.race, visibleEquipment?.gloves?.texture, direction, action]);
  p?.playAnim(pants, [profile?.race, visibleEquipment?.pants?.texture, direction, action]);
  p?.playAnim(accessory, [profile?.race, visibleEquipment?.accessory?.texture, direction, action]);
  playWeapons(p);
  handRight.setTexture(visibleEquipment?.handRight?.texture);
  handLeft.setTexture(visibleEquipment?.handLeft?.texture);
}

export function updateCurrentSpeed(player) {
  const vx = player.vx;
  const vy = player.vy;
  player.currentSpeed = Math.max(Math.abs(vx), Math.abs(vy));

  const canMoveRanged = player.isHero && player.hasRangedWeapon();

  if (player.state.isAttacking && !canMoveRanged) {
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

export function approachAlpha(currentAlpha, targetAlpha, step) {
  const difference = Math.abs(targetAlpha - currentAlpha);

  if (difference <= step) {
    return targetAlpha;
  } else if (currentAlpha < targetAlpha) {
    return currentAlpha + step;
  } else {
    return currentAlpha - step;
  }
}

export function hackFrameRates(player, rate) {
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
  ];
  for (const spriteKey of spriteKeys) {
    player[spriteKey].anims.msPerFrame = player?.state?.isAttacking ? 100 : rate;
  }
}

function playWeapons(player) {
  const {
    profile,
    handLeft,
    handRight,
    weaponAtlas: w,
    action,
    visibleEquipment,
    direction,
  } = player;
  const currentFrame = player?.skin?.anims?.currentFrame;
  const { left, right } = w?.offsets?.[profile?.race]?.[currentFrame.textureFrame] || {};
  handLeft.setPosition(left?.x, left?.y);
  handLeft.setFlipX(left?.flipX);
  handLeft.setFlipY(left?.flipY);
  handLeft.setAngle(left?.rotation);
  handRight.setPosition(right?.x, right?.y);
  handRight.setFlipX(right?.flipX);
  handRight.setFlipY(right?.flipY);
  handRight.setAngle(right?.rotation);

  const bowAngleOffset = Phaser.Math.DegToRad(-135);
  const isRightRanged = player.hasRangedWeaponRight();
  const isLeftRanged = player.hasRangedWeaponLeft();
  const isRightFist = visibleEquipment?.handRight?.base?.includes("fist");
  const isLeftFist = visibleEquipment?.handLeft?.base?.includes("fist");
  const isRightShield = visibleEquipment?.handRight?.type === "shield";
  const isLeftShield = visibleEquipment?.handLeft?.type === "shield";

  if (direction === "down") {
    if (isRightShield) {
      player.bringToTop(handLeft);
    }
    if (isLeftShield) {
      player.bringToTop(handRight);
    }
  }

  if (action === "attack_right") {
    if (isRightFist) {
      if (direction === "left") {
        handRight.setAngle(-90);
        handRight.setFlipY(true);
      }
      if (direction === "right") {
        handRight.setAngle(-90);
      }
    }
  }

  if (isRightRanged) {
    if (action === "attack_right") {
      handRight.setFlipY(false);
      handRight.setFlipX(false);
      handRight.setRotation(player.state.lastAngle + bowAngleOffset);
    }
  }

  if (isLeftRanged) {
    if (action === "attack_left") {
      handLeft.setFlipY(false);
      handLeft.setFlipX(false);
      handLeft.setRotation(player.state.lastAngle + bowAngleOffset);
    }
  }

  if (action === "attack_left") {
    if (isLeftFist) {
      if (direction === "left") {
        handLeft.setAngle(90);
      }
      if (direction === "right") {
        handLeft.setAngle(0);
      }
    }
  }
}
