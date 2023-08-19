// @ts-nocheck
import Phaser from "phaser";
import {
  Character,
  HAIR_HIDING_HELMETS,
  FACE_HIDING_HELMETS,
  ACCESSORY_HIDING_HELMETS,
} from "@aether/shared";
import Bubble from "./Bubble";
import Spell from "./Spell";
import Bar from "./Bar";
import Crosshair from "./Crosshair";
import Damage from "./Damage";
import WeaponSprite from "./WeaponSprite";
import {
  distanceTo,
  getSpinDirection,
  PLAYER_GRAB_RANGE,
  RACES_WITH_ATTACK_ANIMS,
  deriveElements,
} from "../utils";
import Buff from "./Buff";
import Hit from "./Hit";
const { Sprite, BitmapText } = Phaser.GameObjects;
const BLANK_TEXTURE = "human-blank";

class Player extends Character {
  constructor(scene, args) {
    super(scene, args);
    this.weaponAtlas = scene.cache.json.get("weaponAtlas");
    this.updateData(args);
    this.initSpriteLayers();
    this.drawCharacterFromUserData();
    this.updateHpBar();
    if (this.state.isDead) this.doDeath();
    if (this.kind === "nasty") this.userName.setVisible(false);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  updateState(state) {
    this.state.lockedPlayerId = state.lockedPlayerId;
    this.state.bubbleMessage = state.bubbleMessage;
    this.state.doHpRegen = state.doHpRegen;
    this.state.doHpBuffRegen = state.doHpBuffRegen;
    this.state.doMpRegen = state.doMpRegen;
    this.state.doSpRegen = state.doSpRegen;
    this.state.lastCombat = state.lastCombat;
  }
  updateData(data) {
    this.activeItemSlots = data?.activeItemSlots;
    // filter out equipment slotNames that are not in activeItemsSlots array
    this.equipment = data.equipment;
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
    this.updateVisibleEquipment();
  }
  updateBuffData(data) {
    this.activeItemSlots = data?.activeItemSlots;
    // Update properties within stats object, excluding hp, mp, and sp
    this.buffs = data?.buffs;
    this.stats = data?.stats;
    this.state.activeSets = data?.state?.activeSets;
    // filter out equipment slotNames that are not in activeItemsSlots array
    this.updateVisibleEquipment();
  }
  updateExtas() {
    this.checkAttackHands();
    this.drawCharacterFromUserData();
    this.updateHpBar();
  }
  doRegen() {
    if (this.state.doHpRegen) {
      this.takeHit({ type: "hp", amount: this?.stats?.regenHp });
    }
    if (this.state.doHpBuffRegen) {
      const regenBuff = this.buffs?.find((b) => ["regeneration"]?.includes(b?.name));
      this.takeHit({ type: "hp", amount: regenBuff?.stats?.regenHp });
    }
    if (this.state.doMpRegen) {
      this.takeHit({ type: "mp", amount: this?.stats?.regenMp });
    }
    if (this.state.doSpRegen) {
      this.takeHit({ type: "sp", amount: this?.stats?.regenSp });
    }
  }
  initSpriteLayers() {
    const scene = this.scene;
    const defaults = [scene, 0, this.bodyOffsetY, BLANK_TEXTURE];
    this.setDepth(100);

    const HandSprite = this?.profile?.race === "human" ? WeaponSprite : Sprite;

    this.skin = scene.add.existing(new Sprite(...defaults));
    this.chest = scene.add.existing(new Sprite(...defaults));
    this.face = scene.add.existing(new Sprite(...defaults));
    this.whiskers = scene.add.existing(new Sprite(...defaults));
    this.hair = scene.add.existing(new Sprite(...defaults));
    this.armor = scene.add.existing(new Sprite(...defaults));
    this.helmet = scene.add.existing(new Sprite(...defaults));
    this.boots = scene.add.existing(new Sprite(...defaults));
    this.gloves = scene.add.existing(new Sprite(...defaults));
    this.pants = scene.add.existing(new Sprite(...defaults));
    this.accessory = scene.add.existing(new Sprite(...defaults));
    this.handLeft = scene.add.existing(new HandSprite(scene, 13, -9, BLANK_TEXTURE));
    this.handRight = scene.add.existing(new HandSprite(scene, -13, -9, BLANK_TEXTURE));
    this.shadow = scene.add.existing(new Sprite(...defaults));
    this.bubble = scene.add.existing(new Bubble(scene, this?.headY, this.bubbleMessage));
    this.crosshair = scene.add.existing(
      new Crosshair(scene, 0, this.bodyOffsetY, "icons", "crosshair", this, 40)
    );
    this.hpBar = scene.add.existing(new Bar(scene, 0, this?.headY, 32, 12)).setVisible(false);
    this.userName = scene.add.existing(new BitmapText(this.scene, 0, 8, "nin-light").setScale(0.5));
    // this.buffRack = scene.add.existing(new BuffRack(scene, 0, 19, this.buffs));
    this.corpse = scene.add
      .existing(new Sprite(scene, 0, this.bodyOffsetY, "icons", "grave"))
      .setVisible(false);
    this.talkMenu = scene.add
      .existing(new Sprite(scene, 6, this?.headY - 6, "icons", "chat"))
      .setVisible(false);
    this.add(this.shadow);
    this.add(this.chest);
    this.add(this.skin);
    this.add(this.face);
    this.add(this.whiskers);
    this.add(this.hair);
    this.add(this.accessory);
    this.add(this.armor);
    this.add(this.boots);
    this.add(this.gloves);
    this.add(this.pants);
    this.add(this.helmet);
    this.add(this.handLeft);
    this.add(this.handRight);
    this.add(this.bubble);
    this.add(this.userName);
    this.add(this.hpBar);
    this.add(this.corpse);
    this.add(this.talkMenu);

    if (this.isHero) {
      this.add(this.crosshair);
    }
  }
  drawCharacterFromUserData() {
    const { profile, visibleEquipment, state, stats } = this || {};
    if (profile?.userName) {
      this.userName.setText(profile?.userName);
      this.userName.setX(-this.userName.width / 2);
      this.userName.setTint(profile?.userNameTint);
    }
    this.skin.setScale(profile?.scale || 1);
    this.shadow.setScale(profile?.scale || 1);
    this.skin.setTint(profile?.tint || "0xFFFFFF");
    this.chest.setTint(profile?.tint || "0xFFFFFF");
    this.hair.setTint(profile?.hair?.tint || "0xFFFFFF");
    this.face.setTint(profile?.face?.tint || "0xFFFFFF");
    this.whiskers.setTint(profile?.whiskers?.tint || "0xFFFFFF");

    if (this.profile.race === "human") {
      this.handLeft.setElements(
        state.hasWeaponLeft ? deriveElements(visibleEquipment?.handLeft?.stats) : []
      );
      this.handRight.setElements(
        state.hasWeaponRight ? deriveElements(visibleEquipment?.handRight?.stats) : []
      );
    }

    for (const [key, slot] of Object.entries(visibleEquipment)) {
      this?.[key]?.setTint(slot?.tint || "0xFFFFFF");
    }

    /* Helmet types that hide face and hair need to get hidden */
    this.hair.setVisible(true);
    if (HAIR_HIDING_HELMETS.includes(visibleEquipment?.helmet?.texture)) {
      this.hair.setVisible(false);
    }
    this.face.setVisible(true);
    this.whiskers.setVisible(true);
    if (FACE_HIDING_HELMETS.includes(visibleEquipment?.helmet?.texture)) {
      this.face.setVisible(false);
      this.whiskers.setVisible(false);
    }
    this.accessory.setVisible(true);
    if (ACCESSORY_HIDING_HELMETS.includes(visibleEquipment?.helmet?.texture)) {
      this.accessory.setVisible(false);
    }
  }
  doAttack({ count }) {
    const { state } = this;
    if (this?.hasBuff("stun")) return;
    if (this?.isHero && (!state.hasWeapon || state.isDead || state.isAttacking)) return;

    let spellName = "attack_right";
    let action = this.action;

    /* Play attack animation frame (human only) */
    if (RACES_WITH_ATTACK_ANIMS.includes(this.profile.race)) {
      action = spellName = this.getAttackActionName({ count });
    }

    state.isAttacking = true;
    state.lastAttack = Date.now();
    this.action = action;

    // If we are the hero, need to trigger the socket that we attacked
    if (this.isHero) {
      this.scene.socket.emit("attack", { count, direction: this.direction });
    }

    // draw our physical animation. also handles collision...
    this.scene.add.existing(new Spell(this.scene, { id: null, caster: this, spellName }));
  }
  castSpell(spellData) {
    const { state, isHero } = this || {};
    if (isHero) {
      if (state.isDead || state.isCasting) return;
      if (this?.hasBuff("stun")) return;
      const { abilitySlot, castAngle } = spellData || {};
      if (!this.canCastSpell(abilitySlot)) return;
      this.scene.socket.emit("castSpell", { abilitySlot, castAngle });
    }
    state.isCasting = true;
    state.lastCast = Date.now();
    this.scene.add.existing(new Spell(this.scene, { ...spellData, caster: this }));
  }
  doGrab() {
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

    if (closestDistance <= PLAYER_GRAB_RANGE) {
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
    this.whiskers.setVisible(false);
    this.hair.setVisible(false);
    this.accessory.setVisible(false);
    this.armor.setVisible(false);
    this.helmet.setVisible(false);
    this.boots.setVisible(false);
    this.gloves.setVisible(false);
    this.pants.setVisible(false);
    this.handLeft.setVisible(false);
    this.handRight.setVisible(false);
    this.hpBar.setVisible(false);
    this.bubble.setVisible(false);
    this.skin.setVisible(false);
    this.corpse.setVisible(true);
    if (this.kind === "nasty") this.userName.setVisible(false);
    if (this.isHero) window.dispatchEvent(new Event("HERO_DEAD"));
  }
  respawn() {
    this.state.isDead = false;
    this.stats.hp = this.stats.maxHp;
    this.updateHpBar();
    this.shadow.setVisible(true);
    this.chest.setVisible(true);
    this.skin.setVisible(true);
    this.face.setVisible(true);
    this.whiskers.setVisible(true);
    this.hair.setVisible(true);
    this.accessory.setVisible(true);
    this.armor.setVisible(true);
    this.helmet.setVisible(true);
    this.boots.setVisible(true);
    this.gloves.setVisible(true);
    this.pants.setVisible(true);
    this.handLeft.setVisible(true);
    this.handRight.setVisible(true);
    this.hpBar.setVisible(false);
    this.corpse.setVisible(false);
    this.drawCharacterFromUserData();
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
    this.gloves.setTint(color);
    this.accessory.setTint(color);
    this.face.setTint(color);
    this.whiskers.setTint(color);
  }
  showHideNameAndBars() {
    if (this.checkOutOfCombat()) {
      this.hpBar.setVisible(false);
      if (this.kind === "nasty") this.userName.setVisible(false);
    } else {
      this.hpBar.setVisible(true);
      if (this.kind === "nasty") this.userName.setVisible(true);
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
    if (this?.state?.isDead) return;

    const { stats, scene } = this || {};
    const { type, elements } = hit || {};
    const isDamage = hit?.amount < 0;

    scene.add.existing(new Damage(this.scene, this, hit));

    switch (type) {
      case "buff":
        scene.add.existing(new Buff(this.scene, this, hit?.buffName));
        break;
      case "death":
        stats.hp = 0;
        scene.add.existing(new Hit(this.scene, this, elements));
        this.doDeath();
        break;
      case "hp":
        this.modifyStat("hp", hit?.amount);
        if (isDamage) {
          scene.add.existing(new Hit(this.scene, this, elements));
          this.doFlashAnimation("0xFF0000");
          this.state.lastFlash = Date.now();
          this.state.isFlash = true;
        }
        break;
      case "mp":
        this.modifyStat("mp", hit?.amount);
        break;
      case "sp":
        this.modifyStat("sp", hit?.amount);
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
    this.showHideNameAndBars();
    this.setBubbleMessage();
    this.setTalkMenu();
    this.setDepth(100 + this.y + this?.body?.height);
    this.checkAttackReady();
    if (this.isHero) {
      this.checkCastReady(delta);
      this.checkPotionCooldown(delta);
      this.triggerSecondAttack();
    }
  }
  //
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
    p.isHero
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

function updateCurrentSpeed(player) {
  const vx = player.vx;
  const vy = player.vy;
  player.currentSpeed = Math.max(Math.abs(vx), Math.abs(vy));

  if (player.state.isAttacking) {
    return;
  }

  if (player.state.isAiming) {
    player.action = "stand";
    return;
  }

  player.action = player.currentSpeed === 0 ? "stand" : "walk";
}

function hackFrameRates(player, rate) {
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

  const isRightFist = visibleEquipment?.handRight?.base?.includes("fist");
  const isLeftFist = visibleEquipment?.handLeft?.base?.includes("fist");
  const isRightShield = visibleEquipment?.handRight?.texture?.includes("shield");
  const isLeftShield = visibleEquipment?.handLeft?.texture?.includes("shield");

  if (direction === "down") {
    if (isRightShield) {
      player.bringToTop(handLeft);
    }
    if (isLeftShield) {
      player.bringToTop(handRight);
    }
  }

  if (action === "attack_right" && isRightFist) {
    if (direction === "left") {
      handRight.setAngle(-90);
      handRight.setFlipY(true);
    }
    if (direction === "right") {
      handRight.setAngle(-90);
    }
  }
  if (action === "attack_left" && isLeftFist) {
    if (direction === "left") {
      handLeft.setAngle(90);
    }
    if (direction === "right") {
      handLeft.setAngle(0);
    }
  }
}

export default Player;
