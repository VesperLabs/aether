const Phaser = require("phaser");
class Player extends Phaser.GameObjects.Container {
  constructor(
    scene,
    { x, y, socketId, isHero = false, isServer = false, speed = 300, room }
  ) {
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
      isIdle: true,
    };
    scene.physics.add.existing(this);
    this.body.setCircle(8, -8, -8);
    /* For the server, don't draw this stuff */
    if (isServer) return;
    this.race = "human";
    this.gender = "female";
    this.initSpriteLayers();
    this.weaponAtlas = scene.cache.json.get("weaponAtlas");
    this.equips = {
      handLeft: "weapon-sword-short",
      handRight: "weapon-sword-short",
    };
    /* Do we really need these? */
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }

  initSpriteLayers() {
    const scene = this.scene;
    const blankSprite = "human-blank";
    const defaults = [scene, 0, -14, blankSprite];
    this.skin = scene.add.existing(new Phaser.GameObjects.Sprite(...defaults));
    this.chest = scene.add.existing(new Phaser.GameObjects.Sprite(...defaults));
    this.face = scene.add.existing(new Phaser.GameObjects.Sprite(...defaults));
    this.hair = scene.add.existing(new Phaser.GameObjects.Sprite(...defaults));
    this.armor = scene.add.existing(new Phaser.GameObjects.Sprite(...defaults));
    this.helmet = scene.add.existing(
      new Phaser.GameObjects.Sprite(...defaults)
    );
    this.boots = scene.add.existing(new Phaser.GameObjects.Sprite(...defaults));
    this.pants = scene.add.existing(new Phaser.GameObjects.Sprite(...defaults));
    this.accessory = scene.add.existing(
      new Phaser.GameObjects.Sprite(...defaults)
    );
    this.handLeft = scene.add.existing(
      new Phaser.GameObjects.Sprite(scene, 13, -9, blankSprite)
    );
    this.handRight = scene.add.existing(
      new Phaser.GameObjects.Sprite(scene, -13, -9, blankSprite)
    );
    this.shadow = scene.add.existing(
      new Phaser.GameObjects.Sprite(...defaults)
    );
    // this.add(this.attackSprite);
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
  update() {
    if (this.isServer) return;
    updatePlayerDirection(this);
    drawFrame(this);
    hackFrameRates(this, Math.round(80 + 2500 / (this.currentSpeed + 1)));
  }
  destroy() {
    if (this.scene) this.scene.events.off("update", this.update, this);
    if (this.scene) this.scene.physics.world.disable(this);
    super.destroy(true);
  }
}

function drawFrame(p) {
  const {
    skin,
    chest,
    armor,
    hair,
    accessory,
    helmet,
    handLeft,
    handRight,
    pants,
    boots,
    face,
    shadow,
    race,
    gender,
    direction,
    action,
    equips,
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
    handRight.setFlipX(true);
    handLeft.setFlipX(false);
  } else if (direction === "down") {
    p.bringToTop(chest);
    p.bringToTop(armor);
    p.bringToTop(face);
    p.bringToTop(accessory);
    p.bringToTop(handRight);
    p.bringToTop(handLeft);
    handRight.setFlipX(false);
    handLeft.setFlipX(true);
  } else if (direction === "left") {
    p.bringToTop(chest);
    p.bringToTop(armor);
    p.bringToTop(hair);
    p.bringToTop(face);
    p.bringToTop(accessory);
    p.bringToTop(helmet);
    p.bringToTop(handLeft);
    p.sendToBack(handRight);
    handRight.setFlipX(false);
    handLeft.setFlipX(false);
  } else if (direction === "right") {
    p.bringToTop(chest);
    p.bringToTop(armor);
    p.bringToTop(hair);
    p.bringToTop(face);
    p.bringToTop(accessory);
    p.bringToTop(helmet);
    p.sendToBack(handLeft);
    p.bringToTop(handRight);
    handRight.setFlipX(true);
    handLeft.setFlipX(true);
  }
  handRight.setFlipY(false);
  handLeft.setFlipY(false);
  handRight.setRotation(0);
  handLeft.setRotation(0);

  playAnim(skin, [race, direction, action]);
  if (race === "human") {
    playAnim(chest, [race, gender, "chest-bare", direction, action]);
    playAnim(shadow, [race, "shadow", direction, action]);
  } else {
    playAnim(chest, [race, "blank", direction, action]);
  }
  playAnim(face, [race, gender, "face-1", direction, action]);
  playAnim(hair, [race, gender, "hair-1", direction, action]);
  //playAnim(armor, [race, gender, "armor-wizard-robe", direction, action]);
  playAnim(helmet, [race, "helmet-bunny", direction, action]);
  playAnim(boots, [race, "boots-cloth", direction, action]);
  playAnim(pants, [race, "pants-cloth", direction, action]);
  playAnim(accessory, [race, "accessory-glasses", direction, action]);
  playWeapons(p);
  handRight.setTexture(equips.handRight);
  handLeft.setTexture(equips.handLeft);
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
  const { race, handLeft, handRight, weaponAtlas: w } = player;
  const currentFrame = player?.skin?.anims?.currentFrame;
  const { left, right } = w?.offsets?.[race]?.[currentFrame.textureFrame] || {};
  handLeft.setPosition(left?.x, left?.y);
  handRight.setPosition(right?.x, right?.y);
}

function playAnim(sprite, parts) {
  const animKey = parts?.join("-");
  const currentFrame = sprite?.anims?.currentFrame?.index || 0;
  const currentKey = sprite?.anims?.currentAnim?.key;
  if (animKey !== currentKey) {
    sprite.play(animKey, true, currentFrame);
  }
}

module.exports = Player;
