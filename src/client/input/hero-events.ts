import type Phaser from "phaser";
import type { SceneHud } from "@/client/scenes/hud-scene";
import type { SceneMain } from "@/client/scenes/main-scene";
import { playAudio } from "@/client/audio/play-audio";
import { getSpinDirection } from "@/client/input/spin-direction";
import { CONSUMABLES_BASES, POTION_BASES } from "@/rules/inventory";
import { isThrowable } from "@/rules/capture";
import { getAbilityCosts, hasStaminaFor } from "@/rules/combat";
import { getSpellCooldown, isAimed } from "@/rules/spells";
import {
  updateAttackCooldown,
  updatePotionCooldown,
  updateSpellCooldown,
  updateThrowCooldown,
} from "./hero-cooldowns";
import { isTypableFieldActive } from "./typable-field";
import { getHeadingAngle, isTap } from "./tap-aim";
import { bufferCast, clearBufferedCast, isReadyToCast, releaseBufferedCast } from "./cast-buffer";

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
    if (isTypableFieldActive()) return;
    const { spell, spellName, base } = hero.getAbilityDetails(e?.detail);
    const slot = e?.detail;
    if (slot === undefined) return;
    if (isThrowable(base)) {
      /* A throw pressed during a cast, or while one waits to start, is dropped */
      if (hero.isCasting || hero.queuedCastSlot !== undefined) return;
    } else if (!isReadyToCast(hero, slot)) {
      /* A spell pressed mid-cast or on cooldown waits and goes once it can (see cast-buffer.ts) */
      return bufferCast(slot);
    }
    /* A ball aims like a ranged shot: hold to aim, let go to throw */
    if (isThrowable(base)) {
      hero.pressedAbilitySlot = e?.detail;
      hero.state.isAiming = true;
      hero.state.aimingBall = base;
      gameElement.style.cursor = "none";
      scene.socket.emit("updateState", { isAiming: true, aimingBall: base });
      return;
    }
    if (!isAimed(spell)) {
      hero.pressedAbilitySlot = e?.detail;
      return;
    }

    /* A spell on cooldown, or too dear, can't be aimed, and letting go of it won't cast it */
    if (hero.canCastSpell(e?.detail, false)) {
      hero.pressedAbilitySlot = e?.detail;
      hero.state.isAiming = true;
      hero.state.aimingSpellName = spellName;
      /* A lunge taps like a dodge: a tap goes the way you're heading, a hold aims */
      hero.state.aimPressedAt = spell.delivery.type === "dash" ? Date.now() : undefined;
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

    clearBufferedCast();
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
  /** A thrown ball stays in the hand until its flight takes it (see ball-in-hand.ts). */
  const stopAiming = (hero: NonNullable<SceneMain["hero"]>, isThrown = false) => {
    hero.state.isAiming = false;
    hero.state.aimingSpellName = null;
    if (isThrown || !hero.state.aimingBall) {
      scene.socket.emit("updateState", { isAiming: false });
    } else {
      hero.state.aimingBall = null;
      scene.socket.emit("updateState", { isAiming: false, aimingBall: null });
    }
    gameElement.style.cursor = "default";
  };
  /* Thrown, it flies as a spell the server starts; whatever it hits struggles in `capturing` */
  let lastThrowAt: number | undefined;
  const throwBall = (
    hero: NonNullable<SceneMain["hero"]>,
    item: { id?: string; base?: string; stats?: { spCost?: number } | null },
    location: string,
  ) => {
    /* Too soon or too tired: the server would refuse it anyway */
    const cooldown = getSpellCooldown(item?.base);
    if (!item?.id || Date.now() - (lastThrowAt ?? -Infinity) < cooldown) return false;
    if (!hasStaminaFor(hero.stats?.sp, getAbilityCosts(item.stats).sp)) return false;
    lastThrowAt = Date.now();
    updateThrowCooldown(item.base as string);
    socket.emit("throwItem", { location, item: { id: item.id }, angle: hero.state.lastAngle ?? 0 });
    return true;
  };
  window.addEventListener("HERO_ABILITY", (e) => {
    const hero = mainScene?.hero;
    const abilitySlot = e?.detail;
    if (releaseBufferedCast(abilitySlot, Date.now())) return;
    /* Only the release of a press that was taken: not one made mid-cast, nor one an attack called off */
    if (!hero || hero.pressedAbilitySlot !== abilitySlot) return;
    hero.pressedAbilitySlot = undefined;
    const { type, spell, stats, base, id } = hero.getAbilityDetails(abilitySlot);
    if (hero.isCasting) return;

    if (isThrowable(base)) {
      return stopAiming(hero, throwBall(hero, { id, base, stats }, "abilities"));
    }

    if (type === "spell" && stats?.castTime) {
      /*
       * Letting go starts the cast, once the hero has stopped (see hero-movement.ts), so a tap
       * still works while slowing down. Aiming stays on: the spell fires where you aim at the end.
       */
      if (hero.canCastSpell(abilitySlot, false)) {
        hero.queuedCastSlot = abilitySlot;
        hero.queuedCastAt = Date.now();
      }
    } else if (type === "spell") {
      /* Tell the UI to update the cooldown */
      updateSpellCooldown(hero, abilitySlot);

      const isTapped = spell.delivery.type === "dash" && isTap(hero.state, Date.now());
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
