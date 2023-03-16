import Phaser from "phaser";
import Character from "./Character";
import Bubble from "./Bubble";
import Spell from "./Spell";
import Bar from "./Bar";
import Damage from "./Damage";
const { Sprite, BitmapText } = Phaser.GameObjects;
const BLANK_TEXTURE = "human-blank";
class Player extends Character {
  constructor(scene, args) {
    super(scene, args);
    this.weaponAtlas = scene.cache.json.get("weaponAtlas");
    this.bodyOffsetY = -14 * (this?.profile?.scale || 1);
    this.initSpriteLayers();
    this.drawCharacterFromUserData();
    this.checkAttackHands();
    this.updateHpBar();
    if (this.state.isDead) this.doDeath();
    if (this.kind === "nasty") this.userName.setVisible(false);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  updateData(data) {
    this.equipment = data?.equipment;
    this.profile = data?.profile;
    this.stats = data?.stats;
    this.drawCharacterFromUserData();
    this.checkAttackHands();
    this.updateHpBar();
  }
  checkAttackHands() {
    this.state.hasWeaponRight = false;
    this.state.hasWeaponLeft = false;
    this.state.hasWeapon = false;
    /* Can only attack with a hand if it contains a weapon type item  */
    const leftType = this.equipment?.handLeft?.type;
    const rightType = this.equipment?.handRight?.type;
    if (rightType === "weapon") this.state.hasWeaponRight = true;
    if (leftType === "weapon") this.state.hasWeaponLeft = true;
    if (this.state.hasWeaponRight || this.state.hasWeaponLeft) this.state.hasWeapon = true;
  }
  doRegen() {
    if (this.state.doHpRegen) {
      this.takeHit({ type: "healHp", amount: this?.stats?.regenHp });
    }
    if (this.state.doMpRegen) {
    }
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
    this.bubble = scene.add.existing(new Bubble(scene, this?.profile?.headY, this.bubbleMessage));
    this.hpBar = scene.add
      .existing(new Bar(scene, 0, this?.profile?.headY, 32, 12))
      .setVisible(false);
    this.userName = scene.add.existing(new BitmapText(this.scene, 0, 8, "nin-light").setScale(0.5));
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
    this.add(this.userName);
    this.add(this.hpBar);
  }
  drawCharacterFromUserData() {
    const { profile, equipment, state } = this || {};
    if (profile?.userName) {
      this.userName.setText(profile?.userName);
      this.userName.setX(-this.userName.width / 2);
      this.userName.setTint(profile?.userNameTint);
    }
    if (profile?.scale) {
      this.skin.setScale(profile?.scale);
    }
    if (profile?.tint) {
      this.skin.setTint(profile?.tint);
      this.chest.setTint(profile?.tint);
    }
    if (profile?.hair?.tint) {
      this.hair.setTint(profile?.hair?.tint);
    }
    for (const [key, slot] of Object.entries(equipment)) {
      this?.[key]?.setTint(slot?.tint);
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
  updateHpBar() {
    const { stats } = this;
    const percent = stats?.maxHp > 0 ? stats?.hp / stats?.maxHp : 0;
    this.hpBar.setPercent(percent);
  }
  doDeath() {
    this.state.isDead = true;
    this.state.isAttacking = false;
    this.shadow.setVisible(false);
    this.chest.setVisible(false);
    this.face.setVisible(false);
    this.hair.setVisible(false);
    this.accessory.setVisible(false);
    this.armor.setVisible(false);
    this.helmet.setVisible(false);
    this.boots.setVisible(false);
    this.pants.setVisible(false);
    this.handLeft.setVisible(false);
    this.handRight.setVisible(false);
    this.hpBar.setVisible(false);
    this.bubble.setVisible(false);
    this.skin.setTexture("icons").setFrame("grave").setTint("0xFFFFFF");
    if (this.isHero) {
      window.dispatchEvent(new Event("hero_died"));
    }
  }
  respawn() {
    this.state.isDead = false;
    this.stats.hp = this.stats.maxHp;
    this.updateHpBar();
    this.drawCharacterFromUserData();
    this.shadow.setVisible(true);
    this.chest.setVisible(true);
    this.face.setVisible(true);
    this.hair.setVisible(true);
    this.accessory.setVisible(true);
    this.armor.setVisible(true);
    this.helmet.setVisible(true);
    this.boots.setVisible(true);
    this.pants.setVisible(true);
    this.handLeft.setVisible(true);
    this.handRight.setVisible(true);
    this.hpBar.setVisible(false);
    if (this.isHero) {
      window.dispatchEvent(new Event("hero_respawn"));
    }
  }
  checkDeath() {
    /* Ensures the textures and depth have been updated for death state */
    if (this.state.isDead) {
      if (this.skin.texture.key !== "icons") {
        this.doDeath();
      }
      this.setDepth(100 + this.y);
      return true;
    }
  }
  takeHit(hit) {
    const { stats, state } = this;
    this.scene.add.existing(new Damage(this.scene, this, hit));
    if (state.isDead) return;
    if (hit.type == "death") {
      stats.hp = 0;
      this.doDeath();
    } else if (hit.type == "healHp") {
      this.modifyStat("hp", hit?.amount);
    } else {
      this.modifyStat("hp", hit?.amount);
    }
    this.updateHpBar();
  }
  update(time, delta) {
    if (this.checkDeath()) return;
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
  if (Date.now() - p.state.lastAttack > delta + p.stats.attackDelay) {
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
    hpBar,
    userName,
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

  p.bringToTop(userName);
  p.bringToTop(bubble);
  p.bringToTop(hpBar);

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
  const vx = player?.isHero ? player.body.velocity.x : player.vx;
  const vy = player?.isHero ? player.body.velocity.y : player.vy;
  player.currentSpeed = Math.max(Math.abs(vx), Math.abs(vy));

  /* Get velocity from server updates if we are not the hero */
  if (!player?.isHero) {
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
  /* If a part is missing, clear the texture */
  if (parts?.some((p) => !p)) return sprite.setTexture(BLANK_TEXTURE);
  /* Otherwise try to play the texture animation */
  const animKey = parts?.join("-");
  const currentFrame = sprite?.anims?.currentFrame?.index || 0;
  const currentKey = sprite?.anims?.currentAnim?.key;
  if (animKey !== currentKey) {
    sprite.play(animKey, true, currentFrame);
  }
}

export default Player;
