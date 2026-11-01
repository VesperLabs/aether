import { spellDetails } from "@/content";
import { getNextAttackCount, POTION_COOLDOWN } from "@/rules/combat";
import { DODGE_COOLDOWN } from "@/rules/movement";
import type { Player } from "@/client/views/player";
import type { AbilitySlot } from "@/client/window-events";

export function updateAttackCooldown(hero: Player) {
  if (hero.state.isAttacking) return;
  /* Out of stamina the attack won't fire, so don't start its cooldown */
  const count = getNextAttackCount(hero.state.lastAttackCount, hero);
  if (!hero.hasStaminaForAttack(count, hero.state.lastAbilitySlot)) return;
  const attackDelay = hero?.getFullAttackDelay(count);
  const duration = attackDelay;
  window.dispatchEvent(
    new CustomEvent("HERO_START_COOLDOWN", {
      detail: { spellName: "attack", duration: duration, startTime: Date.now() },
    }),
  );
}

export function updatePotionCooldown(hero: Player) {
  if (hero.state.isPotioning) return;
  hero.state.lastPotion = Date.now();
  window.dispatchEvent(
    new CustomEvent("HERO_START_COOLDOWN", {
      detail: {
        spellName: "potion",
        duration: POTION_COOLDOWN,
        startTime: Date.now(),
      },
    }),
  );
}

export function updateSpellCooldown(hero: Player, abilitySlot: AbilitySlot) {
  if (!hero.canCastSpell(abilitySlot, false)) return;
  const castDelay = hero?.stats?.castDelay;
  const ability = hero?.abilities?.[abilitySlot];
  const spellName = ability?.base;
  const baseCooldown =
    (spellDetails as Record<string, { baseCooldown?: number }>)?.[spellName]?.baseCooldown ?? 0;
  window.dispatchEvent(
    new CustomEvent("HERO_START_COOLDOWN", {
      detail: {
        spellName,
        duration: castDelay + baseCooldown,
        sharedDuration: castDelay,
        startTime: Date.now(),
      },
    }),
  );
}

export function updateDodgeCooldown() {
  window.dispatchEvent(
    new CustomEvent("HERO_START_COOLDOWN", {
      detail: { spellName: "dodge", duration: DODGE_COOLDOWN, startTime: Date.now() },
    }),
  );
}
