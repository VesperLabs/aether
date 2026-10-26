// @ts-nocheck
import {
  Character,
  distanceTo,
  MIN_STEALTH_ALPHA,
  calculateStealthVisibilityPercent,
} from "@/shared";
import { Spell } from "./spell";
import { getSpinDirection } from "@/client/input/spin-direction";
import { applyAppearance, createSpriteLayers } from "./player-layers";
import { applyHit } from "./player-hit";
import {
  approachAlpha,
  checkIsFlash,
  drawFrame,
  hackFrameRates,
  updateCurrentSpeed,
} from "./player-animation";
const BLANK_TEXTURE = "human-blank";
const PLAYER_GRAB_RANGE = 32;

export class Player extends Character {
  constructor(scene, args) {
    super(scene, args);

    if (this.hasBuff("stealth")) {
      this.setAlpha(0);
    }

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
    if (!state) return;
    const patch = (key: string) => {
      if (state[key] !== undefined) (this.state as any)[key] = state[key];
    };
    patch("lockedPlayerId");
    patch("bubbleMessage");
    patch("doHpRegen");
    patch("doBuffPoison");
    patch("doHpBuffRegen");
    patch("doMpRegen");
    patch("doSpRegen");
    patch("lastCombat");

    if (!this.isHero) {
      patch("lastAngle");
      patch("isAiming");
      patch("isHoldingAttack");
    }
  }
  updateData(data) {
    if (data?.peerId !== undefined) this.peerId = data.peerId;
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
    this.updateExtas();
  }
  updateExtas() {
    this.drawCharacterFromUserData();
    this.updateHpBar();
    this.buffRack.compareBuffs(this.buffs);
  }
  doRegen() {
    if (this.state.doHpRegen) {
      this.takeHit({ type: "hp", amount: this?.stats?.regenHp }, false);
    }
    if (this.state.doBuffPoison) {
      const poisonBuff = this.getBuff("poison");
      if (poisonBuff) this.takeHit({ type: "hp", amount: -(poisonBuff?.stats?.poisonDamage || 0) });
    }
    if (this.state.doHpBuffRegen) {
      const regenBuff = this.getBuff("regeneration");
      if (regenBuff)
        this.takeHit({ type: "hp", amount: regenBuff?.stats?.regenHp, elements: ["holy"] });
    }
    if (this.state.doMpRegen) {
      this.takeHit({ type: "mp", amount: this?.stats?.regenMp });
    }
    if (this.state.doSpRegen) {
      this.takeHit({ type: "sp", amount: this?.stats?.regenSp });
    }
  }
  initSpriteLayers() {
    createSpriteLayers(this);
  }
  updateUserName() {
    const { profile, scene, stats } = this || {};
    const mainScene = scene.scene.manager.getScene("SceneMain");
    const level = mainScene?.userSettings?.charLevels ? ` lv. ${stats.level}` : "";
    this.userName.setText(`${profile?.userName}${level}`);
    this.userName.setX(-this.userName.width / 2);
    this.userName.setTint(profile?.userNameTint);
  }
  drawCharacterFromUserData() {
    applyAppearance(this);
  }
  doAttack({ count, castAngle, direction, abilitySlot }) {
    const { state, isHero } = this;
    const { isDead, isAttacking, isHoldingAttack } = state ?? {};

    if (this?.hasBuff("stun")) return;
    if (isHero) {
      if (!this.hasWeapon() || isDead || isAttacking || !isHoldingAttack) return;
      if (!this.canCastSpell(abilitySlot)) return;
    }

    const { action, spellName } = this.getAttackActionName({ count, abilitySlot });

    state.lastAttackCount = count;
    state.isAttacking = true;
    state.lastAttack = Date.now();
    this.action = action;
    this.direction = direction || this.direction;

    // If we are the hero, need to trigger the socket that we attacked
    if (isHero) {
      this.scene.socket.emit("attack", {
        count,
        direction: this.direction,
        castAngle,
        abilitySlot,
      });
    }

    // draw our physical animation.
    this.scene.add.existing(
      new Spell(this.scene, { id: null, caster: this, spellName, castAngle, action }),
    );
  }
  doCast({ abilitySlot, castAngle }) {
    const { isHero } = this || {};
    const ability = this.getAbilityDetails(abilitySlot);

    if (isHero) {
      if (!this.canCastSpell(abilitySlot)) return;
      if (this?.hasBuff("stun")) return;
      this.scene.socket.emit("castSpell", { abilitySlot, castAngle });
    }

    this.scene.add.existing(new Spell(this.scene, { ...ability, castAngle, caster: this }));
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
    const inputString = this.state.bubbleMessage ?? "";
    const regex = /^0x[0-9A-Fa-f]+/; // Match the color hex at the beginning
    const colorHex = inputString.match(regex)?.[0];
    const remainingString = inputString.replace(regex, "");
    this.bubble.setTint(colorHex ?? "0xFFFFFF");
    this.bubble.setMessage(remainingString);
  }
  updateHpBar() {
    const { stats } = this;
    const percent = stats?.maxHp > 0 ? stats?.hp / stats?.maxHp : 0;
    this.hpBar.setPercent(percent);
  }
  doDeath() {
    this.setAlpha(1);
    this.body.setVelocity(0, 0);
    this.state.isDead = true;
    this.state.isAttacking = false;
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
    this.buffRack.setVisible(false);
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
    const { state } = this ?? {};
    const shouldShow = !this.checkOutOfCombat() || state?.isHovering;

    this.hpBar.setVisible(shouldShow);
    this.buffRack.setVisible(shouldShow && state?.isHovering);

    if (this.kind === "nasty") {
      this.userName.setVisible(shouldShow);
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
  takeHit(hit, showDamage = true) {
    applyHit(this, hit, showDamage);
  }
  checkStealth({ distance }) {
    const stealthBuff = this.getBuff("stealth");
    let alpha = this.alpha;
    if (!stealthBuff) {
      // if this player is not stealthed
      if (alpha === 1) return;
      alpha = approachAlpha(alpha, 1, 0.25);
    } else if (this.isHero) {
      // always will see your own player at this alpha
      alpha = approachAlpha(alpha, MIN_STEALTH_ALPHA, 0.1);
    } else {
      // how we see other stealthed players
      const targetAlpha = calculateStealthVisibilityPercent({
        distance,
        observer: this?.scene?.hero,
        stealthBuff,
        player: this,
      });
      alpha = approachAlpha(alpha, targetAlpha, 0.1);
    }
    return this.setAlpha(alpha);
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
      this.checkPotionCooldown(delta);
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
