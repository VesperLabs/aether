import { playAudio } from "@/client/audio/play-audio";
import { getSpinDirection } from "@/client/input/spin-direction";
import { CONSUMABLES_BASES, POTION_BASES } from "@/shared/rules/inventory";
import { updateAttackCooldown, updatePotionCooldown, updateSpellCooldown } from "./hero-cooldowns";
import { isTypableFieldActive } from "./typable-field";

/** Wires window and canvas events (attack, aim, abilities, items, dragging) to the hero. */
export function addGlobalEventListeners(scene) {
  const isTouch = scene.sys.game.device.input.touch;
  const mainScene = scene.scene.manager.getScene("SceneMain");
  const socket = scene.socket;

  /* Disable context menu on canvas */
  document.getElementById("game").addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });
  /* Desktop left click attack */
  document.getElementById("game").addEventListener("mousedown", function (event) {
    if (!isTouch && event.button !== 0) {
      window.dispatchEvent(new CustomEvent("HERO_ATTACK_START"));
    }
  });
  /* Desktop left click attack */
  document.getElementById("game").addEventListener("mouseup", function (event) {
    if (!mainScene?.hero) return;
    const hero = mainScene?.hero;
    if (!isTouch && event.button !== 0) {
      const pointer = scene.input.activePointer;
      const cursorPoint = pointer.positionToCamera(mainScene.cameras.main);
      hero.direction = getSpinDirection(hero, cursorPoint);
      window.dispatchEvent(new CustomEvent("HERO_ATTACK"));
    }
  });
  window.addEventListener(
    "HERO_AIM_START",
    (e: CustomEvent) => {
      if (!mainScene?.hero || isTypableFieldActive()) return;
      const hero = mainScene?.hero;
      const { isAimable } = hero.getAbilityDetails(e?.detail);

      if (isAimable) {
        hero.state.isAiming = true;
        document.getElementById("game").style.cursor = "none";
        scene.socket.emit("updateState", { isAiming: hero.state.isAiming });
      }
    },
    scene,
  );
  window.addEventListener(
    "HERO_ATTACK", // we let go of the attack button
    (e: CustomEvent) => {
      const hero = mainScene?.hero;
      if (!hero) return;

      document.getElementById("game").style.cursor = "default";

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
    scene,
  );
  window.addEventListener(
    "HERO_ATTACK_START",
    (e: CustomEvent) => {
      if (!mainScene?.hero) return;
      const hero = mainScene?.hero;

      hero.state.isHoldingAttack = true;
      hero.state.lastAbilitySlot = e?.detail;

      if (hero.hasRangedWeapon()) {
        hero.state.isAiming = true;
        document.getElementById("game").style.cursor = "none";
      }
      scene.socket.emit("updateState", {
        isAiming: hero.state.isAiming,
        isHoldingAttack: hero.state.isHoldingAttack,
      });
    },
    scene,
  );
  window.addEventListener(
    "HERO_ABILITY",
    (e: CustomEvent) => {
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
        document.getElementById("game").style.cursor = "default";
      }
    },
    scene,
  );
  /* TODO: Move to server and create a consumeItemFunction */
  window.addEventListener("HERO_USE_ITEM", (e: CustomEvent) => {
    const hero = mainScene?.hero;
    const { item, location } = e?.detail ?? {};

    if (!hero.checkCastReady()) return;

    /* If it is food we are trying to consume it */
    if (CONSUMABLES_BASES?.includes(item?.base)) {
      /* Tell the UI to update the cooldowns */
      if (item.base === "food") {
        updateSpellCooldown(hero, e?.detail);
      }
      if (POTION_BASES.includes(item.base)) {
        if (hero.state.isPotioning) return; /* TODO: Needs to happen serverside */
        updatePotionCooldown(hero);
      }
    }

    socket.emit("consumeItem", { item, location });

    window.dispatchEvent(
      new CustomEvent("AUDIO_ITEM_CONSUME", {
        detail: item,
      }),
    );
  });
  window.addEventListener(
    "HERO_GRAB",
    (e) => {
      const hero = mainScene?.hero;
      hero?.doGrab?.();
    },
    scene,
  );
  window.addEventListener(
    "AUDIO_ITEM_CONSUME",
    (e) => {
      const hero = mainScene?.hero;
      playAudio({ scene: mainScene, audioKey: "item-bubble", caster: hero });
    },
    scene,
  );
  window.addEventListener(
    "AUDIO_ITEM_SELL",
    (e) => {
      const hero = mainScene?.hero;
      playAudio({ scene: mainScene, audioKey: "item-sell", caster: hero });
    },
    scene,
  );
  window.addEventListener(
    "ITEM_DRAG",
    (e: CustomEvent) => {
      const hero = mainScene?.hero;
      const pointer = scene.input.activePointer;
      pointer.x = e?.detail.x;
      pointer.y = e?.detail.y;
      const cursorPoint = pointer.positionToCamera(mainScene.cameras.main);
      const direction = getSpinDirection({ x: hero.x, y: hero.y + hero.bodyOffsetY }, cursorPoint);

      if (hero?.direction !== direction) {
        hero.direction = direction;
        scene.socket.emit("changeDirection", { direction });
      }
    },
    scene,
  );
}
