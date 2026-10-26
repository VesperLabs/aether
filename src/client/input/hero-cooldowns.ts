import { spellDetails } from "@/shared/content";
import { POTION_COOLDOWN } from "@/shared/rules/combat";
import type { Player } from "@/client/views/player";
import type { AbilitySlot } from "@/client/window-events";

export function updateAttackCooldown(hero: Player) {
  if (hero.state.isAttacking) return;
  const attackDelay = hero?.getFullAttackDelay();
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
  const baseCooldown = (spellDetails as Record<string, { baseCooldown?: number }>)?.[spellName]?.baseCooldown ?? 0;
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
