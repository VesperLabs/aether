import type Phaser from "phaser";
import { keepAiming } from "@/client/views/player-actions";
import type { SceneHud } from "@/client/scenes/hud-scene";
import type { SceneMain } from "@/client/scenes/main-scene";
import { playAudio } from "@/client/audio/play-audio";
import { getSpinDirection } from "@/client/input/spin-direction";
import { CONSUMABLES_BASES, POTION_BASES } from "@/rules/inventory";
import { canThrow, isThrowable } from "@/rules/capture";
import { getAbilityCosts, hasStaminaFor } from "@/rules/combat";
import {
  updateAttackCooldown,
  updatePotionCooldown,
  updateSpellCooldown,
  updateThrowCooldown,
} from "./hero-cooldowns";
import { isTypableFieldActive } from "./typable-field";
import { getHeadingAngle, isTap } from "./tap-aim";

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
    const hero = mainScene?.hero;
    if (!hero) return;
    /* A dropped press drops its release too, so nothing casts without the aimer having shown */
    hero.pressedAbilitySlot = undefined;
    /* A press during a cast, or while one waits to start, is dropped */
    if (isTypableFieldActive() || hero.isCasting || hero.queuedCastSlot !== undefined) return;
    const { isAimable, isLunge, spellName, base } = hero.getAbilityDetails(e?.detail);
    /* A ball aims like a ranged shot: hold to aim, let go to throw */
    if (isThrowable(base)) {
      hero.pressedAbilitySlot = e?.detail;
      hero.state.isAiming = true;
      gameElement.style.cursor = "none";
      scene.socket.emit("updateState", { isAiming: hero.state.isAiming });
      return;
    }
    if (!isAimable) {
      hero.pressedAbilitySlot = e?.detail;
      return;
    }

    /* A spell on cooldown, or too dear, can't be aimed, and letting go of it won't cast it */
    if (hero.canCastSpell(e?.detail, false)) {
      hero.pressedAbilitySlot = e?.detail;
      hero.state.isAiming = true;
      hero.state.aimingSpellName = spellName;
      /* A lunge taps like a dodge: a tap goes the way you're heading, a hold aims */
      hero.state.aimPressedAt = isLunge ? Date.now() : undefined;
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
      if (hero.hasRangedWeapon() && hero.state.isHoldingAttack) {
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

    /* Attacking while aiming or casting only calls the spell off: it doesn't swing too */
    if (hero.isCasting) return scene.socket.emit("cancelCast");
    if (hero.queuedCastSlot !== undefined) {
      hero.queuedCastSlot = undefined;
      return stopAiming(hero);
    }
    if (hero.state.aimingSpellName) {
      hero.pressedAbilitySlot = undefined;
      return stopAiming(hero);
    }

    hero.state.isHoldingAttack = true;
    hero.state.lastAbilitySlot = e?.detail;
    hero.state.aimingSpellName = null;

    if (hero.hasRangedWeapon()) {
      hero.state.isAiming = true;
      gameElement.style.cursor = "none";
    }
    scene.socket.emit("updateState", {
      isAiming: hero.state.isAiming,
      isHoldingAttack: hero.state.isHoldingAttack,
    });
  });
  const stopAiming = (hero: NonNullable<SceneMain["hero"]>) => {
    hero.state.isAiming = false;
    hero.state.aimingSpellName = null;
    scene.socket.emit("updateState", { isAiming: hero.state.isAiming });
    gameElement.style.cursor = "default";
  };
  /* The server picks what it hits and whether it catches; the flying ball is drawn when it says so */
  let lastThrowAt: number | undefined;
  const throwBall = (
    hero: NonNullable<SceneMain["hero"]>,
    item: { id?: string; base?: string; stats?: { spCost?: number } | null },
    location: string,
  ) => {
    /* Too soon or too tired: the server would refuse it anyway */
    if (!item?.id || !canThrow(lastThrowAt, Date.now())) return;
    if (!hasStaminaFor(hero.stats?.sp, getAbilityCosts(item.stats).sp)) return;
    lastThrowAt = Date.now();
    updateThrowCooldown(item.base as string);
    socket.emit("throwItem", { location, item: { id: item.id }, angle: hero.state.lastAngle ?? 0 });
    keepAiming(hero);
  };
  window.addEventListener("HERO_ABILITY", (e) => {
    const hero = mainScene?.hero;
    const abilitySlot = e?.detail;
    /* Only the release of a press that was taken: not one made mid-cast, nor one an attack called off */
    if (!hero || hero.pressedAbilitySlot !== abilitySlot) return;
    hero.pressedAbilitySlot = undefined;
    const { type, isLunge, stats, base, id } = hero.getAbilityDetails(abilitySlot);
    if (hero.isCasting) return;

    if (isThrowable(base)) {
      throwBall(hero, { id, base, stats }, "abilities");
      return stopAiming(hero);
    }

    if (type === "spell" && stats?.castTime) {
      /*
       * Letting go starts the cast, once the hero has stopped (see hero-movement.ts), so a tap
       * still works while slowing down. Aiming stays on: the spell fires where you aim at the end.
       */
      if (hero.canCastSpell(abilitySlot, false)) hero.queuedCastSlot = abilitySlot;
    } else if (type === "spell") {
      /* Tell the UI to update the cooldown */
      updateSpellCooldown(hero, abilitySlot);

      const isTapped = isLunge && isTap(hero.state, Date.now());
      hero?.doCast?.({
        abilitySlot,
        castAngle: isTapped ? getHeadingAngle(hero) : hero?.state?.lastAngle,
      });

      stopAiming(hero);
    }
  });
  window.addEventListener("HERO_CAST_ENDED", (e) => {
    const hero = mainScene?.hero;
    if (!hero) return;
    if (e.detail != null) {
      updateSpellCooldown(hero, e.detail);
      hero.canCastSpell(e.detail);
    }
    stopAiming(hero);
  });
  /* TODO: Move to server and create a consumeItemFunction */
  window.addEventListener("HERO_USE_ITEM", (e) => {
    const hero = mainScene?.hero;
    const { item, location } = e?.detail ?? {};

    if (isThrowable(item?.base)) return throwBall(hero, item, location);
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
