import Phaser from "phaser";
import type { FullCharacterWire, PartyMessage } from "@/network";
import type { BuffCharacterWire } from "@/network/sync";
import type { SceneMain } from "@/client/scenes/main-scene";
import { Character, type CharacterArgs } from "./character";
import { NPC_ENGAGED_BUBBLE } from "@/rules/npc-behavior";
import type { AbilitySlot } from "@/rules/spells";
import {
  doAttack,
  doCast,
  doGrab,
  hasStaminaForAttack,
  type AttackArgs,
  type CastArgs,
} from "./player-actions";
import { fadeStealth } from "./player-stealth";
import { CHARACTER_DIED } from "./end-on-death";
import { applyDodge } from "./player-dodge";
import { applyAppearance, createSpriteLayers } from "./player-layers";
import { applyHit, type HitEffect } from "./player-hit";
import { toTint } from "./tint";
import type { Bubble } from "./bubble";
import type { WindupRing } from "./windup-ring";
import type { Bar } from "./bar";
import type { BuffRack } from "./buff-rack";
import type { WeaponSprite } from "./weapon-sprite";
import type { Crosshair } from "@/client/input/crosshair";
import { checkIsFlash, drawFrame, hackFrameRates, updateCurrentSpeed } from "./player-animation";
const BLANK_TEXTURE = "human-blank";

type Sprite = Phaser.GameObjects.Sprite;

/** Where each hand goes on each animation frame, per race (the `weaponAtlas` json). */
interface HandOffset {
  x: number;
  y: number;
  flipX: boolean;
  flipY: boolean;
  rotation: number;
}
interface WeaponAtlas {
  offsets?: Record<string, Record<string, { left?: HandOffset; right?: HandOffset }>>;
}

/** The part of a character that changes with its buffs. */
type BuffUpdate = BuffCharacterWire | FullCharacterWire;

export class Player extends Character {
  declare scene: SceneMain;
  /** NPCs only: their opt-in behaviors (`aggressive` and so on). */
  behaviors?: readonly string[];
  /** NPCs only: players can talk to it. */
  talks?: boolean;
  /** Only the hero has a party. */
  party?: PartyMessage | null;
  declare weaponAtlas: WeaponAtlas;
  declare skin: Sprite;
  declare chest: Sprite;
  declare face: Sprite;
  declare whiskers: Sprite;
  declare hair: Sprite;
  declare armor: Sprite;
  declare helmet: Sprite;
  declare boots: Sprite;
  declare gloves: Sprite;
  declare pants: Sprite;
  declare accessory: Sprite;
  /** Humans get an elemental border on their weapons, everything else a plain sprite. */
  declare handLeft: Sprite | WeaponSprite;
  declare handRight: Sprite | WeaponSprite;
  declare shadow: Sprite;
  declare bubble: Bubble;
  declare crosshair: Crosshair;
  declare hpBar: Bar;
  declare windupRing: WindupRing;
  declare userName: Phaser.GameObjects.BitmapText;
  declare buffRack: BuffRack;
  declare corpse: Sprite;
  /** The body, gear, hands, name and bars: everything that moves together when the body is nudged. */
  declare rig: Phaser.GameObjects.Container;
  declare layerOrderKey?: string; // the direction and shield the rig was last stacked for
  declare talkMenu: Sprite;
  /** The attack frame a cast holds, and until when. A pose only: it locks nothing, unlike a swing. */
  declare castPose?: { action: string; until: number };
  /** After a throw or cast, the hero keeps facing where it aims until then, walking backwards if need be. */
  declare keepAimingUntil?: number;
  /** The hero let go of a timed spell, which starts as soon as it has stopped moving. */
  declare queuedCastSlot?: AbilitySlot;
  /** The ability key whose press was taken; only letting go of that key uses it. */
  declare pressedAbilitySlot?: AbilitySlot;
  /** A timed spell is counting down. */
  declare isCasting?: boolean;
  constructor(scene: SceneMain, args: CharacterArgs) {
    super(scene, args);
    this.behaviors = (args as { behaviors?: readonly string[] }).behaviors;
    this.talks = (args as { talks?: boolean }).talks;

    if (this.hasBuff("stealth")) {
      this.setAlpha(0);
    }

    this.weaponAtlas = scene.cache.json.get("weaponAtlas");
    this.updateData(args);
    this.initSpriteLayers();
    this.drawCharacterFromUserData();
    this.updateHpBar();

    if (this.state.isDead) this.doDeath();
    if (this.hidesName()) this.userName.setVisible(false);
    scene.events.on("update", this.update, this);
    scene.events.once("shutdown", this.destroy, this);
  }
  /** An NPC that neither talks nor has a human body: it leaves no corpse. */
  isMob() {
    return this.kind === "npc" && !this.talks && this.profile?.race !== "human";
  }
  /** Mobs show their name only in combat or on hover; companions always do. */
  hidesName() {
    return this.isMob() && !this.state?.ownerId;
  }
  updateState(state: Record<string, unknown> | undefined) {
    if (!state) return;
    const patch = (key: string) => {
      if (state[key] !== undefined) this.state[key] = state[key];
    };
    patch("lockedPlayerId");
    patch("ownerId");
    patch("bubbleMessage");
    patch("doBuffPoison");
    patch("doHpBuffRegen");
    patch("lastCombat");

    if (!this.isHero) {
      patch("lastAngle");
      patch("isAiming");
      patch("isHoldingAttack");
    }
  }
  updateData(data: FullCharacterWire) {
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
  updateBuffData(data: BuffUpdate) {
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
  /** Regen effects from the tick flags. The hp/mp/sp totals themselves come with the tick's vitals. */
  doRegen() {
    if (this.state.doBuffPoison) {
      const poisonBuff = this.getBuff("poison");
      if (poisonBuff) this.takeHit({ type: "hp", amount: -(poisonBuff?.stats?.poisonDamage || 0) });
    }
    if (this.state.doHpBuffRegen) {
      const regenBuff = this.getBuff("regeneration");
      if (regenBuff)
        this.takeHit({ type: "hp", amount: regenBuff?.stats?.regenHp, elements: ["holy"] });
    }
  }
  initSpriteLayers() {
    createSpriteLayers(this);
  }
  updateUserName() {
    const { profile, scene, stats } = this || {};
    const mainScene = scene.scene.manager.getScene("SceneMain") as SceneMain;
    const level = mainScene?.userSettings?.charLevels ? ` lv. ${stats.level}` : "";
    this.userName.setText(`${profile?.userName}${level}`);
    this.userName.setX(-this.userName.width / 2);
    this.userName.setTint(toTint(profile?.userNameTint));
  }
  drawCharacterFromUserData() {
    applyAppearance(this);
  }
  /** Whether the hero has the SP for this attack (weapon plus attack-spell cost). */
  hasStaminaForAttack(count: number, abilitySlot?: AbilitySlot) {
    return hasStaminaForAttack(this, count, abilitySlot);
  }
  doAttack(args: AttackArgs) {
    doAttack(this, args);
  }
  doCast(args: CastArgs) {
    doCast(this, args);
  }
  doGrab() {
    doGrab(this);
  }
  setBubbleMessage() {
    const inputString = this.state.bubbleMessage ?? "";
    const regex = /^0x[0-9A-Fa-f]+/; // Match the color hex at the beginning
    const colorHex = inputString.match(regex)?.[0];
    const remainingString = inputString.replace(regex, "");
    this.bubble.setTint(toTint(colorHex ?? "0xFFFFFF"));
    /* A fighting NPC shows its windup ring beside the hp bar instead of a bubble */
    const isEngaged = this.kind !== "player" && remainingString === NPC_ENGAGED_BUBBLE;
    this.bubble.setMessage(isEngaged ? undefined : remainingString);
    this.windupRing.follow(this.x + this.rig.x, this.y + this.rig.y);
    /* Everyone sees a player aiming a spell (an empty ring) and its cast (the ring filling) */
    const isSpellAiming = this.state.isAiming && !this.state.isHoldingAttack;
    const showsCast =
      this.kind === "player" &&
      (isSpellAiming || this.isCasting) &&
      (this.isHero || !this.hasBuff("stealth"));
    this.windupRing.draw((isEngaged || !!showsCast) && !this.state.isDead);
  }
  updateHpBar() {
    const { stats } = this;
    const percent = stats?.maxHp > 0 ? stats?.hp / stats?.maxHp : 0;
    this.hpBar.setPercent(percent);
  }
  /** Shows or hides the body layers (not the bars, bubble or corpse). */
  private setBodyVisible(visible: boolean) {
    const layers = [
      this.shadow,
      this.chest,
      this.face,
      this.whiskers,
      this.hair,
      this.accessory,
      this.armor,
      this.helmet,
      this.boots,
      this.gloves,
      this.pants,
      this.handLeft,
      this.handRight,
      this.skin,
    ];
    for (const layer of layers) layer.setVisible(visible);
  }
  doDeath() {
    this.setAlpha(1);
    this.body.setVelocity(0, 0);
    this.state.isDead = true;
    this.state.isAttacking = false;
    this.setBodyVisible(false);
    this.hpBar.setVisible(false);
    this.bubble.setVisible(false);
    this.windupRing.draw(false);
    this.emit(CHARACTER_DIED);
    this.corpse.setVisible(!this.isMob());
    this.buffRack.setVisible(false);
    if (this.hidesName()) this.userName.setVisible(false);
    if (this.isHero) window.dispatchEvent(new Event("HERO_DEAD"));
  }
  respawn() {
    this.state.isDead = false;
    this.stats.hp = this.stats.maxHp;
    this.updateHpBar();
    this.setBodyVisible(true);
    this.hpBar.setVisible(false);
    this.corpse.setVisible(false);
    this.drawCharacterFromUserData();
    if (this.isHero) {
      window.dispatchEvent(new Event("HERO_RESPAWN"));
    }
  }
  /** Tints the body. `fill` paints it solid (a white hit frame); otherwise the tint multiplies. */
  doFlashAnimation(color = 0xffffff, fill = false) {
    const mode = fill ? Phaser.TintModes.FILL : Phaser.TintModes.MULTIPLY;
    const layers = [this.hair, this.skin, this.chest, this.armor, this.helmet, this.boots];
    layers.push(this.gloves, this.accessory, this.face, this.whiskers);
    for (const layer of layers) layer.setTint(color).setTintMode(mode);
  }
  showHideNameAndBars() {
    const { state } = this ?? {};
    const shouldShow = !this.checkOutOfCombat() || state?.isHovering;

    this.hpBar.setVisible(shouldShow);
    this.buffRack.setVisible(shouldShow && state?.isHovering);

    if (this.hidesName()) {
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
  takeHit(hit: HitEffect, showDamage = true) {
    applyHit(this, hit, showDamage);
  }
  update() {
    if (this.checkDeath()) return;
    hackFrameRates(this, Math.round(80 + 2500 / (this.currentSpeed + 10)));
    updateCurrentSpeed(this);
    drawFrame(this);
    applyDodge(this);
    checkIsFlash(this);
    this.showHideNameAndBars();
    this.setBubbleMessage();
    this.setTalkMenu();
    this.setDepth(100 + this.y + this?.body?.height);
    this.checkAttackReady();
    fadeStealth(this, this.scene.game.loop.delta);
    if (this.isHero) {
      this.checkPotionCooldown();
    }
  }
  //
  playAnim(sprite: Sprite, parts: Array<string | undefined>) {
    let animKey = parts?.join("-");
    /* If a part is missing, clear the texture */
    if (parts?.some((p) => !p)) animKey = `${BLANK_TEXTURE}-${this?.direction}-${this?.action}`;
    /* Otherwise try to play the texture animation */
    const currentKey = sprite?.anims?.currentAnim?.key;
    if (animKey !== currentKey) {
      sprite.play(animKey, true);
    }
  }
  setTalkMenu() {
    const show = !this.state.lockedPlayerId && this.scene.hero?.state.targetNpcId === this.id;
    return this.talkMenu.setVisible(show);
  }
}
