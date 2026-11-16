import type { AbilitySlot } from "@/rules/spells";
import type { Player } from "@/client/views/player";

/** A press let go before its spell could go waits this long for it, ms, then is dropped. */
const RELEASED_WAIT_MS = 700;

/**
 * A spell pressed while the hero couldn't cast it yet (mid-cast, or on cooldown) waits here instead
 * of being dropped, then goes as soon as it can: aimed if the press is still held, cast at once if
 * it was let go. So spells chain without having to press again at the right moment.
 */
let buffered: { slot: AbilitySlot; releasedAt?: number } | undefined;

/** Can the hero start this spell now: not casting or waiting to, and its cooldowns are done? */
export function isReadyToCast(hero: Player, slot: AbilitySlot) {
  if (hero.isCasting || hero.queuedCastSlot !== undefined) return false;
  return hero.checkCastReady(hero.getAbilityDetails(slot).spellName);
}

/** Holds a press that came too early. A newer press replaces it. */
export function bufferCast(slot: AbilitySlot) {
  buffered = { slot };
}

/** The press was let go while waiting: it casts when ready, at the aim of that moment. True if it was waiting. */
export function releaseBufferedCast(slot: AbilitySlot, now: number) {
  if (buffered?.slot !== slot) return false;
  buffered.releasedAt = now;
  return true;
}

/** Drops the waiting press, as an attack or a cancel does. */
export function clearBufferedCast() {
  buffered = undefined;
}

/** Each frame: once the hero can cast it, the waiting press goes, as if it were pressed just now. */
export function updateCastBuffer(hero: Player, now: number) {
  if (!buffered) return;
  const { slot, releasedAt } = buffered;
  if (releasedAt !== undefined && now - releasedAt > RELEASED_WAIT_MS) return clearBufferedCast();
  if (hero.state.isDead || !isReadyToCast(hero, slot)) return;
  clearBufferedCast();
  window.dispatchEvent(new CustomEvent("HERO_AIM_START", { detail: slot }));
  if (releasedAt !== undefined) {
    window.dispatchEvent(new CustomEvent("HERO_ABILITY", { detail: slot }));
  }
}
