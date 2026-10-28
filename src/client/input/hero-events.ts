import type Phaser from "phaser";
import type { SceneHud } from "@/client/scenes/hud-scene";
import type { SceneMain } from "@/client/scenes/main-scene";
import { playAudio } from "@/client/audio/play-audio";
import { getSpinDirection } from "@/client/input/spin-direction";
import { CONSUMABLES_BASES, POTION_BASES } from "@/rules/inventory";
import { updateAttackCooldown, updatePotionCooldown, updateSpellCooldown } from "./hero-cooldowns";
import { isTypableFieldActive } from "./typable-field";

/** Wires window and canvas events (attack, aim, abilities, items, dragging) to the hero. */
export function addGlobalEventListeners(scene: SceneHud) {
  const isTouch = scene.sys.game.device.input.touch;
  const mainScene = scene.scene.manager.getScene("SceneMain") as SceneMain;
  const socket = scene.socket;
  const gameElement = document.getElementById("game") as HTMLElement;

  /* Disable context menu on canvas */
  gameElement.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });
  /* Desktop click attack: pressed on the canvas, released anywhere (a HUD modal can open over the
   * canvas mid-press, or the window can lose focus) so the hero never stays stuck attacking. */
  let isCanvasAttackHeld = false;
  gameElement.addEventListener("mousedown", function (event) {
    if (!isTouch && event.button !== 0) {
      isCanvasAttackHeld = true;
      window.dispatchEvent(new CustomEvent("HERO_ATTACK_START"));
    }
  });
  window.addEventListener("mouseup", function (event) {
    if (!isCanvasAttackHeld || event.button === 0) return;
    isCanvasAttackHeld = false;
    const hero = mainScene?.hero;
    if (!hero) return;
    const pointer = scene.input.activePointer;
    const cursorPoint = pointer.positionToCamera(mainScene.cameras.main) as Phaser.Math.Vector2;
    hero.direction = getSpinDirection(hero, cursorPoint);
    window.dispatchEvent(new CustomEvent("HERO_ATTACK"));
  });
  window.addEventListener("blur", () => {
    if (!isCanvasAttackHeld) return;
    isCanvasAttackHeld = false;
    window.dispatchEvent(new CustomEvent("HERO_ATTACK"));
  });
  window.addEventListener("HERO_AIM_START", (e) => {
    if (!mainScene?.hero || isTypableFieldActive()) return;
    const hero = mainScene?.hero;
    const { isAimable } = hero.getAbilityDetails(e?.detail);

    if (isAimable) {
      hero.state.isAiming = true;
      gameElement.style.cursor = "none";
      scene.socket.emit("updateState", { isAiming: hero.state.isAiming });
    }
  });
  window.addEventListener(
    "HERO_ATTACK", // we let go of the attack button
    (e) => {
      const hero = mainScene?.hero;
      if (!hero) return;

      gameElement.style.cursor = "default";

      // shoot arrows etc
      if (hero.hasRangedWeapon()) {
        updateAttackCooldown(hero);
        hero?.doAttack?.({ count: 1, castAngle: hero.state.lastAngle, direction: hero.direction });
      }

      // release these states
      hero.state.isAiming = false;
      hero.state.isHoldingAttack = false;

      scene.socket.emit("updateState", {
        isAiming: hero.state.isAiming,
        isHoldingAttack: hero.state.isHoldingAttack,
      });
    },
  );
  window.addEventListener("HERO_ATTACK_START", (e) => {
    if (!mainScene?.hero) return;
    const hero = mainScene?.hero;

    hero.state.isHoldingAttack = true;
    hero.state.lastAbilitySlot = e?.detail;

    if (hero.hasRangedWeapon()) {
      hero.state.isAiming = true;
      gameElement.style.cursor = "none";
    }
    scene.socket.emit("updateState", {
      isAiming: hero.state.isAiming,
      isHoldingAttack: hero.state.isHoldingAttack,
    });
  });
  window.addEventListener("HERO_ABILITY", (e) => {
    const hero = mainScene?.hero;
    const abilitySlot = e?.detail;
    const { type } = hero.getAbilityDetails(abilitySlot);

    if (type === "spell") {
      /* Tell the UI to update the cooldown */
      updateSpellCooldown(hero, abilitySlot);

      hero?.doCast?.({
        abilitySlot,
        castAngle: hero?.state?.lastAngle,
      });

      hero.state.isAiming = false;
      scene.socket.emit("updateState", { isAiming: hero.state.isAiming });
      gameElement.style.cursor = "default";
    }
  });
  /* TODO: Move to server and create a consumeItemFunction */
  window.addEventListener("HERO_USE_ITEM", (e) => {
    const hero = mainScene?.hero;
    const { item, location } = e?.detail ?? {};

    if (!hero.checkCastReady()) return;

    /* If it is food we are trying to consume it */
    if (CONSUMABLES_BASES?.includes(item?.base)) {
      /* Tell the UI to update the cooldowns */
      if (item.base === "food") {
        const abilitySlot = Object.keys(hero.abilities ?? {}).find(
          (slot) => hero.abilities?.[slot]?.id === item?.id,
        );
        if (location === "abilities" && abilitySlot) {
          updateSpellCooldown(hero, abilitySlot);
        }
      }
      if (POTION_BASES.includes(item.base)) {
        if (hero.state.isPotioning) return; /* TODO: Needs to happen serverside */
        updatePotionCooldown(hero);
      }
    }

    socket.emit("consumeItem", { item: { ...item }, location });

    window.dispatchEvent(
      new CustomEvent("AUDIO_ITEM_CONSUME", {
        detail: item,
      }),
    );
  });
  window.addEventListener("HERO_GRAB", () => {
    const hero = mainScene?.hero;
    hero?.doGrab?.();
  });
  window.addEventListener("AUDIO_ITEM_CONSUME", (e) => {
    const hero = mainScene?.hero;
    playAudio({ scene: mainScene, audioKey: "item-bubble", caster: hero });
  });
  window.addEventListener("AUDIO_ITEM_SELL", (e) => {
    const hero = mainScene?.hero;
    playAudio({ scene: mainScene, audioKey: "item-sell", caster: hero });
  });
  window.addEventListener("ITEM_DRAG", (e) => {
    const hero = mainScene?.hero;
    const pointer = scene.input.activePointer;
    pointer.x = e?.detail.x;
    pointer.y = e?.detail.y;
    const cursorPoint = pointer.positionToCamera(mainScene.cameras.main) as Phaser.Math.Vector2;
    const direction = getSpinDirection({ x: hero.x, y: hero.y + hero.bodyOffsetY }, cursorPoint);

    if (hero?.direction !== direction) {
      hero.direction = direction;
      scene.socket.emit("changeDirection", { direction });
    }
  });
}
