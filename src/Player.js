import Phaser from "phaser";
import Character from "../shared/Character";
import Bubble from "./Bubble";
import Spell from "./Spell";
import Bar from "./Bar";
import Damage from "./Damage";
import BuffRack from "./BuffRack";
import { distanceTo, getSpinDirection } from "./utils";
const { Sprite, BitmapText } = Phaser.GameObjects;
const BLANK_TEXTURE = "human-blank";

class Player extends Character {
  constructor(scene, args) {
    super(scene, args);
    this.weaponAtlas = scene.cache.json.get("weaponAtlas");
    this.bodyOffsetY = -14 * (this?.profile?.scale || 1);
    this.updateData(args);
    this.initSpriteLayers();
    this.drawCharacterFromUserData();
    this.updateHpBar();
    if (this.state.isDead) this.doDeath();
    if (this.kind === "nasty") this.userName.setVisible(false);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  updateData(data) {
    this.activeItemSlots = data?.activeItemSlots;
    // filter out equipment slotNames that are not in activeItemsSlots array
    this.equipment = Object.fromEntries(
      Object.entries(data?.equipment).filter(([key]) => this.activeItemSlots.includes(key))
    );
    this.abilities = data?.abilities;
    this.inventory = data?.inventory;
    this.profile = data?.profile;
    this.stats = data?.stats;
    this.gold = data?.gold;
    this.npcKills = data?.npcKills;
    this.quests = data?.quests;
    this.buffs = data?.buffs;
    // update states individually
    this.state.activeSets = data?.state?.activeSets;
  }
  updateExtas() {
    this.drawCharacterFromUserData();
    this.checkAttackHands();
    this.updateHpBar();
  }
  doRegen() {
    if (this.state.doHpRegen) {
      this.takeHit({ type: "hp", amount: this?.stats?.regenHp });
    }
    if (this.state.doMpRegen) {
      this.takeHit({ type: "mp", amount: this?.stats?.regenMp });
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
    this.buffRack = scene.add.existing(new BuffRack(scene, 0, 19, this.buffs));
    this.corpse = scene.add
      .existing(new Sprite(scene, 0, this.bodyOffsetY, "icons", "grave"))
      .setVisible(false);
    this.talkMenu = scene.add
      .existing(new Sprite(scene, 6, this?.profile?.headY - 6, "icons", "chat"))
      .setVisible(false);
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
    this.add(this.corpse);
    this.add(this.talkMenu);
    this.add(this.buffRack);
  }
  drawCharacterFromUserData() {
    const { profile, equipment, state } = this || {};
    if (profile?.userName) {
      this.userName.setText(profile?.userName);
      this.userName.setX(-this.userName.width / 2);
      this.userName.setTint(profile?.userNameTint);
    }
    this.skin.setScale(profile?.scale || 1);
    this.skin.setTint(profile?.tint || "0xFFFFFF");
    this.chest.setTint(profile?.tint || "0xFFFFFF");
    this.hair.setTint(profile?.hair?.tint || "0xFFFFFF");
    this.face.setTint(profile?.face?.tint || "0xFFFFFF");

    for (const [key, slot] of Object.entries(equipment)) {
      this?.[key]?.setTint(slot?.tint || "0xFFFFFF");
    }
  }
  doAttack(count) {
    const { state } = this;
    if (state.isAttacking) return;
    if (this?.isHero && (!state.hasWeapon || state.isDead))
      return; /* Heros with no weapon cannot attack */
    state.isAttacking = true;
    state.lastAttack = Date.now();

    let spellName = "attack_right";
    /* Play attack animation frame (human only) */
    if (this.profile.race === "human") {
      if (count === 1) {
        /* Will always start with a right attack. Will either swing right or left if has weapon. */
        if (state.hasWeaponRight) this.action = "attack_right";
        else if (state.hasWeaponLeft) this.action = "attack_left";
      } else if (count === 2) {
        /* Always finishes with a left if both hands have weapons */
        if (state.hasWeaponLeft) this.action = "attack_left";
      }
      spellName = this.action;
    }

    // If we are the hero, need to trigger the socket that we attacked
    if (this.isHero) {
      this.scene.socket.emit("attack", { count, direction: this.direction });
    }

    this.scene.add.existing(new Spell(this.scene, { id: null, caster: this, spellName }));
  }
  castSpell(spellData) {
    const { state, isHero } = this || {};
    if (isHero) {
      if (state.isDead || state.isCasting) return;
      const { abilitySlot, castAngle } = spellData || {};
      if (!this.canCastSpell(abilitySlot)) return;
      this.scene.socket.emit("castSpell", { abilitySlot, castAngle });
    }
    state.isCasting = true;
    state.lastCast = Date.now();
    this.scene.add.existing(new Spell(this.scene, { ...spellData, caster: this }));
  }
  doGrab() {
    const GRAB_RANGE = 32;
    const { scene } = this;
    const loots = scene.loots?.getChildren?.();

    let closestLoot;
    let closestDistance = Infinity;
    /* Look for the nearest loots */
    loots.forEach((loot) => {
      const distance = distanceTo(loot, this);
      if (distance < closestDistance) {
        closestLoot = loot;
        closestDistance = distance;
      }
    });

    if (closestDistance <= GRAB_RANGE) {
      /* Spin hero toward the loot, send it all the API */
      this.direction = getSpinDirection(this, closestLoot);
      this.scene.socket.emit("grabLoot", { lootId: closestLoot?.id, direction: this.direction });
    }
  }
  setBubbleMessage() {
    this.bubble.setMessage(this.state.bubbleMessage);
  }
  updateHpBar() {
    const { stats } = this;
    const percent = stats?.maxHp > 0 ? stats?.hp / stats?.maxHp : 0;
    this.hpBar.setPercent(percent);
  }
  doDeath() {
    this.body.setVelocity(0, 0);
    this.state.isDead = true;
    this.state.isAttacking = false;
    this.state.isCasting = false;
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
    this.skin.setVisible(false);
    this.corpse.setVisible(true);
    if (this.isHero) {
      window.dispatchEvent(new Event("HERO_DEAD"));
    }
  }
  respawn() {
    this.state.isDead = false;
    this.stats.hp = this.stats.maxHp;
    this.updateHpBar();
    this.drawCharacterFromUserData();
    this.shadow.setVisible(true);
    this.chest.setVisible(true);
    this.skin.setVisible(true);
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
    this.corpse.setVisible(false);
    if (this.isHero) {
      window.dispatchEvent(new Event("HERO_RESPAWN"));
    }
  }
  doFlashAnimation(color = "0xFFFFFF") {
    this.hair.setTint(color);
    this.skin.setTint(color);
    this.chest.setTint(color);
    this.armor.setTint(color);
    this.helmet.setTint(color);
    this.boots.setTint(color);
    this.accessory.setTint(color);
    this.face.setTint(color);
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
    const { stats, state, scene } = this || {};

    const { type } = hit || {};
    const isPositive = hit?.amount >= 0;
    if (state.isDead) return;
    scene.add.existing(new Damage(this.scene, this, hit));

    switch (type) {
      case "death":
        stats.hp = 0;
        this.doDeath();
        break;
      case "hp":
        this.modifyStat("hp", hit?.amount);
        this.doFlashAnimation(isPositive ? "0x00FF00" : "0xFF0000");
        this.state.lastFlash = Date.now();
        this.state.isFlash = true;
        break;
      case "mp":
        this.modifyStat("mp", hit?.amount);
        break;
      case "exp":
        this.modifyStat("exp", hit?.amount);
        break;
    }

    /* Not sure events like this is the best approach */
    if (this?.isHero) {
      window.dispatchEvent(new Event("UPDATE_HUD"));
    }
    this.updateHpBar();
  }
  update(time, delta) {
    if (this.checkDeath()) return;
    hackFrameRates(this, Math.round(80 + 2500 / (this.currentSpeed + 10)));
    updateCurrentSpeed(this);
    drawFrame(this);
    checkIsFlash(this, delta);
    this.checkAttackReady(delta);
    this.checkCastReady(delta);
    this.setBubbleMessage();
    this.setTalkMenu();
    if (this?.isHero) this.triggerSecondAttack();
    this.setDepth(100 + this.y + this?.body?.height);
  }
  playAnim(sprite, parts) {
    let animKey = parts?.join("-");
    /* If a part is missing, clear the texture */
    if (parts?.some((p) => !p)) animKey = `${BLANK_TEXTURE}-${this?.direction}-${this?.action}`;
    /* Otherwise try to play the texture animation */
    const currentFrame = sprite?.anims?.currentFrame?.index || 0;
    const currentKey = sprite?.anims?.currentAnim?.key;
    if (animKey !== currentKey) {
      sprite.play(animKey, true, currentFrame);
    }
  }
  setTalkMenu() {
    const show = !this.state.lockedPlayerId && this.scene.hero.state.targetNpcId === this.id;
    return this.talkMenu.setVisible(show);
  }
}

function checkIsFlash(p, delta) {
  /* Let us attack again when it is ready */
  if (Date.now() - p.state.lastFlash > delta + 50 && p.state.isFlash) {
    p.state.isFlash = false;
    p.drawCharacterFromUserData();
  }
}

function drawFrame(p) {
  const {
    buffs,
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
    buffRack,
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
  p.bringToTop(buffRack);
  p.bringToTop(bubble);
  p.bringToTop(hpBar);

  p?.playAnim(skin, [profile?.race, direction, action]);
  if (profile?.race === "human") {
    p?.playAnim(chest, [profile?.race, profile?.gender, "chest-bare", direction, action]);
    p?.playAnim(shadow, [profile?.race, "shadow", direction, action]);
  } else {
    p?.playAnim(chest, [BLANK_TEXTURE, direction, action]);
  }
  p?.playAnim(face, [profile?.race, profile?.face?.texture, direction, action]);
  p?.playAnim(hair, [profile?.race, profile?.hair?.texture, direction, action]);
  p?.playAnim(
    armor,
    [profile?.race, profile?.gender, equipment?.armor?.texture, direction, action],
    p.isHero
  );
  p?.playAnim(helmet, [profile?.race, equipment?.helmet?.texture, direction, action]);
  p?.playAnim(boots, [profile?.race, equipment?.boots?.texture, direction, action]);
  p?.playAnim(pants, [profile?.race, equipment?.pants?.texture, direction, action]);
  p?.playAnim(accessory, [profile?.race, equipment?.accessory?.texture, direction, action]);
  playWeapons(p);
  handRight.setTexture(equipment?.handRight?.texture);
  handLeft.setTexture(equipment?.handLeft?.texture);
  buffRack.compareBuffs(buffs);
}

function updateCurrentSpeed(player) {
  const vx = player?.isHero ? player.body.velocity.x : player.vx;
  const vy = player?.isHero ? player.body.velocity.y : player.vy;
  player.currentSpeed = Math.max(Math.abs(vx), Math.abs(vy));

  /* Action */
  if (player.state.isAttacking) {
    return;
  }
  if (vx === 0 && vy === 0) {
    player.action = "stand";
  } else {
    player.action = "walk";
    /* For casting spells */
    player.state.lastAngle = Math.atan2(player.body.velocity.y, player.body.velocity.x);
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
  if (
    equipment?.handRight?.texture?.includes("katar") ||
    equipment?.handLeft?.texture?.includes("katar")
  ) {
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
        handLeft.setAngle(90);
      }
      if (direction === "right") {
        handLeft.setAngle(-90);
      }
    }
  }
}

export default Player;
