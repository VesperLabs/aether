import Phaser from "phaser";
import Character from "./Character";
import Bubble from "./Bubble";
import Spell from "./Spell";
const Sprite = Phaser.GameObjects.Sprite;

const BLANK_TEXTURE = "human-blank";
class Player extends Character {
  constructor(scene, args) {
    super(scene, args);
    this.weaponAtlas = scene.cache.json.get("weaponAtlas");
    this.bodyOffsetY = -14 * (this?.profile?.scale || 1);
    this.bubbleOffsetY = -50 * (this?.profile?.scale || 1);
    this.initSpriteLayers();
    this.drawCharacterFromUserData();
    this.checkAttackHands();
    /* Do we really need these? */
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  checkAttackHands() {
    /* Can only attack with a hand if it contains a weapon type item  */
    const leftType = this.equipment?.handLeft?.type;
    const rightType = this.equipment?.handRight?.type;
    if (rightType === "weapon") this.state.hasWeaponRight = true;
    if (leftType === "weapon") this.state.hasWeaponLeft = true;
    if (this.state.hasWeaponRight || this.state.hasWeaponLeft) this.state.hasWeapon = true;
  }
  initSpriteLayers() {
    const scene = this.scene;
    const defaults = [scene, 0, this.bodyOffsetY, BLANK_TEXTURE];
    this.setDepth(100);
    this.skin = scene.add.existing(new Sprite(...defaults));
    this.chest = scene.add.existing(new Sprite(...defaults));
    this.face = scene.add.existing(new Sprite(...defaults));
    this.hair = scene.add.existing(new Sprite(...defaults));
    this.armor = scene.add.existing(new Sprite(...defaults));
    this.helmet = scene.add.existing(new Sprite(...defaults));
    this.boots = scene.add.existing(new Sprite(...defaults));
    this.pants = scene.add.existing(new Sprite(...defaults));
    this.accessory = scene.add.existing(new Sprite(...defaults));
    this.handLeft = scene.add.existing(new Sprite(scene, 13, -9, BLANK_TEXTURE));
    this.handRight = scene.add.existing(new Sprite(scene, -13, -9, BLANK_TEXTURE));
    this.shadow = scene.add.existing(new Sprite(...defaults));
    this.bubble = scene.add.existing(new Bubble(scene, this.bubbleOffsetY, this.bubbleMessage));
    this.add(this.shadow);
    this.add(this.chest);
    this.add(this.skin);
    this.add(this.face);
    this.add(this.hair);
    this.add(this.accessory);
    this.add(this.armor);
    this.add(this.boots);
    this.add(this.pants);
    this.add(this.helmet);
    this.add(this.handLeft);
    this.add(this.handRight);
    this.add(this.bubble);
    // this.add(this.usernameText);
    // this.add(this.hpBar);
    // this.add(this.talkMenu);
  }
  drawCharacterFromUserData() {
    const { profile } = this;
    if (profile?.scale) {
      this.skin.setScale(profile?.scale);
    }
    if (profile?.tint) {
      this.skin.setTint("0x" + profile?.tint);
      this.chest.setTint("0x" + profile?.tint);
    }
    if (profile?.hair?.tint) {
      this.hair.setTint("0x" + profile?.hair?.tint);
    }
    /* ToDo: Need headY cords to be loaded with asshat */
    if (profile?.race !== "human") {
      this.bubble.setHeadY(-30);
      //this.hpBar.setHeadY(-20);
    }
  }
  doAttack(count) {
    if (!this.state.hasWeapon) return;
    if (!this.state.isAttacking || !this.isHero) {
      /* Will always start with a right attack. Will either swing right or left if has weapon. */
      if (count === 1) {
        if (this.state.hasWeaponRight) this.action = "attack_right";
        else if (this.state.hasWeaponLeft) this.action = "attack_left";
      } else if (count === 2) {
        /* Always finishes with a left if both hands have weapons */
        if (this.state.hasWeaponLeft) this.action = "attack_left";
      }
      this.scene.add.existing(new Spell(this.scene, this, "attack"));
      this.state.isAttacking = true;
      this.state.lastAttack = Date.now();
      // If we are the hero, need to trigger the socket that we attacked
      if (this.isHero) {
        this.scene.socket.emit("attack", { count, direction: this.direction });
      }
    }
  }
  setBubbleMessage(message) {
    if (message !== this.bubbleMessage) {
      this.bubbleMessage = message;
      this.bubble.setMessage(this.bubbleMessage);
    }
  }
  update(time, delta) {
    hackFrameRates(this, Math.round(80 + 2500 / (this.currentSpeed + 10)));
    updatePlayerDirection(this);
    drawFrame(this);
    checkAttackReady(this, delta);
    this.setDepth(100 + this.y + this?.body?.height);
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy(true);
  }
}

function checkAttackReady(p, delta) {
  /* Let us attack again when it is ready */
  if (Date.now() - p.state.lastAttack > delta + p.stats.attackSpeed) {
    p.state.isAttacking = false;
    if (p.action === "attack_right" && p.state.hasWeaponLeft && p?.isHero) {
      p.doAttack(2);
    }
  }
}

function drawFrame(p) {
  const {
    skin,
    chest,
    armor,
    accessory,
    helmet,
    handLeft,
    handRight,
    pants,
    boots,
    shadow,
    direction,
    action,
    equipment,
    profile,
    face,
    hair,
    bubble,
  } = p;

  /* Depth sort based on direction */
  p.bringToTop(pants);
  p.bringToTop(boots);
  p.bringToTop(armor);

  if (direction === "up") {
    p.bringToTop(hair);
    p.bringToTop(face);
    p.bringToTop(accessory);
    p.bringToTop(helmet);
    p.sendToBack(handLeft);
    p.sendToBack(handRight);
  } else if (direction === "down") {
    p.bringToTop(chest);
    p.bringToTop(armor);
    p.bringToTop(face);
    p.bringToTop(accessory);
    p.bringToTop(handRight);
    p.bringToTop(handLeft);
  } else if (direction === "left") {
    p.bringToTop(chest);
    p.bringToTop(armor);
    p.bringToTop(hair);
    p.bringToTop(face);
    p.bringToTop(accessory);
    p.bringToTop(helmet);
    p.bringToTop(handLeft);
    p.sendToBack(handRight);
  } else if (direction === "right") {
    p.bringToTop(chest);
    p.bringToTop(armor);
    p.bringToTop(hair);
    p.bringToTop(face);
    p.bringToTop(accessory);
    p.bringToTop(helmet);
    p.sendToBack(handLeft);
    p.bringToTop(handRight);
  }

  p.bringToTop(bubble);

  playAnim(skin, [profile?.race, direction, action]);
  if (profile?.race === "human") {
    playAnim(chest, [profile?.race, profile?.gender, "chest-bare", direction, action]);
    playAnim(shadow, [profile?.race, "shadow", direction, action]);
  } else {
    playAnim(chest, [BLANK_TEXTURE, direction, action]);
  }
  playAnim(face, [profile?.race, profile?.face?.texture, direction, action]);
  playAnim(hair, [profile?.race, profile?.hair?.texture, direction, action]);
  playAnim(armor, [profile?.race, profile?.gender, equipment?.armor?.texture, direction, action]);
  playAnim(helmet, [profile?.race, equipment?.helmet?.texture, direction, action]);
  playAnim(boots, [profile?.race, equipment?.boots?.texture, direction, action]);
  playAnim(pants, [profile?.race, equipment?.pants?.texture, direction, action]);
  playAnim(accessory, [profile?.race, equipment?.accessory?.texture, direction, action]);
  playWeapons(p);
  handRight.setTexture(equipment?.handRight?.texture);
  handLeft.setTexture(equipment?.handLeft?.texture);
}

function updatePlayerDirection(player) {
  /* Get velocity from server updates if we are not the hero */
  const vx = player?.isHero ? player.body.velocity.x : player.vx;
  const vy = player?.isHero ? player.body.velocity.y : player.vy;

  player.currentSpeed = Math.max(Math.abs(vx), Math.abs(vy));

  if (Math.abs(vy) > Math.abs(vx)) {
    if (vy > 0) {
      player.direction = "down";
    } else if (vy < 0) {
      player.direction = "up";
    }
  } else {
    if (vx > 0) {
      player.direction = "right";
    } else if (vx < 0) {
      player.direction = "left";
    }
  }
  /* Action */
  if (player.state.isAttacking) {
    return;
  }
  if (vx === 0 && vy === 0) {
    player.action = "stand";
  } else {
    player.action = "walk";
  }
}

function hackFrameRates(player, rate) {
  const spriteKeys = [
    "shadow",
    "chest",
    "skin",
    "face",
    "hair",
    "accessory",
    "armor",
    "boots",
    "pants",
    "helmet",
    "handLeft",
    "handRight",
  ];
  for (const spriteKey of spriteKeys) {
    player[spriteKey].anims.msPerFrame = rate;
  }
}

function playWeapons(player) {
  const { profile, handLeft, handRight, weaponAtlas: w, action, equipment, direction } = player;
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
  if (equipment?.handRight?.texture?.includes("katar")) {
    if (action === "attack_right") {
      if (direction === "left") {
        handRight.setAngle(90);
      }
      if (direction === "right") {
        handRight.setAngle(-90);
      }
    }
    if (action === "attack_left") {
      if (direction === "left") {
        handLeft.setAngle(0);
      }
      if (direction === "right") {
        handLeft.setAngle(0);
      }
    }
  }
}

function playAnim(sprite, parts) {
  if (parts?.some((p) => !p)) return;
  const animKey = parts?.join("-");
  const currentFrame = sprite?.anims?.currentFrame?.index || 0;
  const currentKey = sprite?.anims?.currentAnim?.key;
  if (animKey !== currentKey) {
    sprite.play(animKey, true, currentFrame);
  }
}

export default Player;
