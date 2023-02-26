const Phaser = require("phaser");
const Sprite = Phaser.GameObjects.Sprite;
class Player extends Phaser.GameObjects.Container {
  constructor(scene, { x, y, socketId, isHero = false, isServer = false, speed = 300, room, equips, profile }) {
    super(scene, x, y, []);
    this.startingCoords = { x, y };
    this.socketId = socketId;
    this.isHero = isHero;
    this.speed = speed;
    this.room = room;
    this.isServer = isServer;
    this.action = "stand";
    this.direction = "down";
    this.currentSpeed = 0;
    this.vx = 0;
    this.vy = 0;
    this.state = {
      lastAttack: Date.now(),
      isIdle: true,
      isAttacking: false,
      hasWeaponRight: false,
      hasWeaponLeft: false,
    };
    this.profile = profile;
    this.equips = equips;
    this.stats = {
      attackSpeed: 200,
    };
    scene.physics.add.existing(this);
    this.body.setCircle(8, -8, -8);
    /* For the server, don't draw this stuff */
    if (isServer) return;
    this.initSpriteLayers();
    this.checkAttackHands();
    this.weaponAtlas = scene.cache.json.get("weaponAtlas");
    /* Do we really need these? */
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  checkAttackHands() {
    /* Can only attack with a hand if it contains a weapon type item or is fist */
    const leftType = this.equips?.handRight?.type;
    const rightType = this.equips?.handLeft?.type;
    if (leftType === "weapon" || !leftType) this.state.hasWeaponRight = true;
    if (rightType === "weapon" || !rightType) this.state.hasWeaponLeft = true;
    if (this.state.hasWeaponLeft || this.state.hasWeaponLeft) this.state.hasWeapon = true;
  }
  initSpriteLayers() {
    const scene = this.scene;
    const blank = "human-blank";
    const defaults = [scene, 0, -14, blank];
    this.attackSprite = scene.add.existing(new Sprite(scene, 0, -14, "misc-slash"));
    this.attackSprite.setAlpha(0);
    this.skin = scene.add.existing(new Sprite(...defaults));
    this.chest = scene.add.existing(new Sprite(...defaults));
    this.face = scene.add.existing(new Sprite(...defaults));
    this.hair = scene.add.existing(new Sprite(...defaults));
    this.armor = scene.add.existing(new Sprite(...defaults));
    this.helmet = scene.add.existing(new Sprite(...defaults));
    this.boots = scene.add.existing(new Sprite(...defaults));
    this.pants = scene.add.existing(new Sprite(...defaults));
    this.accessory = scene.add.existing(new Sprite(...defaults));
    this.handLeft = scene.add.existing(new Sprite(scene, 13, -9, blank));
    this.handRight = scene.add.existing(new Sprite(scene, -13, -9, blank));
    this.shadow = scene.add.existing(new Sprite(...defaults));
    this.add(this.attackSprite);
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
    // this.add(this.bubble);
    // this.add(this.usernameText);
    // this.add(this.hpBar);
    // this.add(this.talkMenu);
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
      /* Start animation */
      this.attackSprite.setAlpha(1);
      if (this.action === "attack_left") this.attackSprite.setFlipX(true);
      if (this.action === "attack_right") this.attackSprite.setFlipX(false);
      this.state.isAttacking = true;
      this.state.lastAttack = Date.now();
      // If we are the hero, need to trigger the socket that we attacked
      if (this.isHero) {
        this.scene.socket.emit("attack", { count, direction: this.direction });
      }
    }
  }
  update(time, delta) {
    if (this.isServer) return;
    updatePlayerDirection(this);
    drawFrame(this);
    hackFrameRates(this, Math.round(80 + 2500 / (this.currentSpeed + 1)));
    checkAttackReady(this, delta);
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
    equips,
    profile,
    face,
    hair,
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

  playAnim(skin, [profile?.race, direction, action]);
  if (profile?.race === "human") {
    playAnim(chest, [profile?.race, profile?.gender, "chest-bare", direction, action]);
    playAnim(shadow, [profile?.race, "shadow", direction, action]);
  } else {
    playAnim(chest, [profile?.race, "blank", direction, action]);
  }
  playAnim(face, [profile?.race, profile?.face?.texture, direction, action]);
  playAnim(hair, [profile?.race, profile?.hair?.texture, direction, action]);
  playAnim(armor, [profile?.race, profile?.gender, equips?.armor?.texture, direction, action]);
  playAnim(helmet, [profile?.race, equips?.helmet?.texture, direction, action]);
  playAnim(boots, [profile?.race, equips?.boots?.texture, direction, action]);
  playAnim(pants, [profile?.race, equips?.pants?.texture, direction, action]);
  playAnim(accessory, [profile?.race, equips?.accessory?.texture, direction, action]);
  playAttackSprite(p);
  playWeapons(p);
  handRight.setTexture(equips?.handRight?.texture);
  handLeft.setTexture(equips?.handLeft?.texture);
}

function updatePlayerDirection(player) {
  /* Get velocity from server updates if we are not the hero */
  const vx = player?.isHero ? player.body.velocity.x : player.vx;
  const vy = player?.isHero ? player.body.velocity.y : player.vy;

  player.currentSpeed = Math.max(Math.abs(vx), Math.abs(vy));

  if (Math.abs(vy) >= Math.abs(vx)) {
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
  const { profile, handLeft, handRight, weaponAtlas: w, action, equips, direction } = player;
  const currentFrame = player?.skin?.anims?.currentFrame;
  const { left, right } = w?.offsets?.[profile.race]?.[currentFrame.textureFrame] || {};
  handLeft.setPosition(left?.x, left?.y);
  handLeft.setFlipX(left?.flipX);
  handLeft.setFlipY(left?.flipY);
  handLeft.setAngle(left?.rotation);
  handRight.setPosition(right?.x, right?.y);
  handRight.setFlipX(right?.flipX);
  handRight.setFlipY(right?.flipY);
  handRight.setAngle(right?.rotation);
  if (equips.handRight.texture.includes("katar")) {
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

function playAttackSprite(player) {
  const { attackSprite, direction } = player;

  if (attackSprite.alpha > 0) {
    attackSprite.setAlpha(attackSprite.alpha - 0.3);
  }
  if (direction === "up") attackSprite.setAngle(180);
  if (direction === "down") attackSprite.setAngle(0);
  if (direction === "left") attackSprite.setAngle(90);
  if (direction === "right") attackSprite.setAngle(-90);
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

module.exports = Player;
