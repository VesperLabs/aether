import { spellDetails } from "@/content/spells/spell-details";
import { POTION_COOLDOWN } from "@/rules/combat";
import { DODGE_COOLDOWN } from "@/rules/movement";
import type { HeroSwing } from "@/network/session/hero/hero-session";
import type { Player } from "@/client/views/player";
import type { AbilitySlot } from "@/client/bridge/window-events";

function startCooldown(detail: Record<string, unknown>) {
  window.dispatchEvent(
    new CustomEvent("HERO_START_COOLDOWN", { detail: { ...detail, startTime: Date.now() } }),
  );
}

/** Shows the cooldowns a swing the session sent starts: the weapon's, and its spell's if it had one. */
export function startSwingCooldowns(hero: Player, swing: HeroSwing) {
  startCooldown({ spellName: "attack", duration: hero.getFullAttackDelay(swing.count) });
  if (swing.abilitySlot) startSpellCooldown(hero, swing.abilitySlot);
}

export function updatePotionCooldown(hero: Player) {
  if (hero.state.isPotioning) return;
  hero.state.lastPotion = Date.now();
  startCooldown({ spellName: "potion", duration: POTION_COOLDOWN });
}

/** Shows the cooldown of the spell in `abilitySlot`, if it can be cast now. */
export function updateSpellCooldown(hero: Player, abilitySlot: AbilitySlot) {
  if (hero.canCastSpell(abilitySlot, false)) startSpellCooldown(hero, abilitySlot);
}

function startSpellCooldown(hero: Player, abilitySlot: AbilitySlot) {
  const castDelay = hero?.stats?.castDelay;
  const spellName = hero?.abilities?.[abilitySlot]?.base;
  const baseCooldown =
    (spellDetails as Record<string, { baseCooldown?: number }>)?.[spellName]?.baseCooldown ?? 0;
  startCooldown({ spellName, duration: castDelay + baseCooldown, sharedDuration: castDelay });
}

export function updateDodgeCooldown() {
  startCooldown({ spellName: "dodge", duration: DODGE_COOLDOWN });
}
