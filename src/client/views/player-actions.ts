import { distanceTo } from "@/rules/world";
import { getSpinDirection } from "@/network/session/hero/spin-direction";
import type { Player } from "./player";
import { Spell } from "./spell";
import { playAttackLunge } from "./hit-impact";
import type { LootItem } from "./loot-item";

const PLAYER_GRAB_RANGE = 32;

/** What an attack or a cast needs from the server message that triggered it. */
export interface CastArgs {
  castAngle?: number;
  abilitySlot?: number | string;
}

export interface AttackArgs extends CastArgs {
  count: number;
  direction?: string;
}

/**
 * Plays a swing. The hero's swings come from its session, which decided they may go ahead and
 * sent them; everyone else's come from the server.
 */
export function doAttack(player: Player, { count, castAngle, direction, abilitySlot }: AttackArgs) {
  const { state, isHero } = player;
  if (!isHero && player?.hasBuff("stun")) return;

  const { action, spellName } = player.getAttackActionName({ count, abilitySlot });

  state.lastAttackCount = count;
  if (isHero) window.dispatchEvent(new CustomEvent("HERO_ATTACK_COUNT", { detail: count }));
  state.isAttacking = true;
  if (!isHero) state.lastAttack = Date.now();
  player.action = action;
  player.direction = direction || player.direction;

  playAttackLunge(player, player.direction);
  // draw our physical animation.
  player.scene.add.existing(
    new Spell(player.scene, { id: null, caster: player, spellName, castAngle, action }),
  );
}

export function doCast(player: Player, { abilitySlot, castAngle }: CastArgs) {
  const { isHero } = player || {};
  const ability = player.getAbilityDetails(abilitySlot);

  /* The hero's session checks the cast, sends it and starts the hero's own lunge */
  if (isHero) {
    if (abilitySlot === undefined || !player.scene.heroSession.cast(abilitySlot, castAngle)) return;
    Object.assign(player.state, player.scene.heroSession.combat);
  } else if (ability?.isLunge) {
    /* Others' lunges just leave the trail */
    player.state.lungeAt = Date.now();
    player.state.lungeAngle = castAngle;
  }

  player.scene.add.existing(new Spell(player.scene, { ...ability, castAngle, caster: player }));
}

export function doGrab(player: Player) {
  const { scene } = player;
  const loots = (scene.loots?.getChildren?.() ?? []) as LootItem[];

  let closestLoot: LootItem | undefined;
  let closestDistance = Infinity;
  /* Look for the nearest loots */
  loots.forEach((loot) => {
    const distance = distanceTo(loot, player);
    if (distance < closestDistance) {
      closestLoot = loot;
      closestDistance = distance;
    }
  });

  if (closestLoot && closestDistance <= PLAYER_GRAB_RANGE) {
    /* Spin hero toward the loot, send it all the API */
    player.direction = getSpinDirection(player, closestLoot);
    player.scene.socket.emit("grabLoot", {
      lootId: closestLoot?.id,
      direction: player.direction,
    });
  }
}
