import { distanceTo } from "@/rules/world";
import { getAbilityCosts, getCastAction, hasStaminaFor } from "@/rules/combat";
import type { AbilitySlot } from "@/rules/spells";
import { getSpinDirection } from "@/client/input/spin-direction";
import type { Player } from "./player";
import { Spell } from "./spell";
import { playAttackLunge } from "./hit-impact";
import { playWindupPie, stopWindupPie } from "./windup-pie";
import type { LootItem } from "./loot-item";

const PLAYER_GRAB_RANGE = 32;
/** How long an instant cast holds the attack frame, in ms. */
const CAST_POSE_MS = 300;
/** What an attack or a cast needs from the server message that triggered it. */
export interface CastArgs {
  castAngle?: number;
  abilitySlot?: number | string;
}

export interface AttackArgs extends CastArgs {
  count: number;
  direction?: string;
}

/** Whether the hero has the SP for this attack's ability. The weapon's cost never blocks a swing. */
export function hasStaminaForAttack(player: Player, count: number, abilitySlot?: AbilitySlot) {
  const { stats } = player.getAttackActionName({ count, abilitySlot });
  return hasStaminaFor(player.stats?.sp, getAbilityCosts(stats).sp);
}

export function doAttack(player: Player, { count, castAngle, direction, abilitySlot }: AttackArgs) {
  const { state, isHero } = player;
  const { isDead, isAttacking, isHoldingAttack } = state ?? {};

  if (player?.hasBuff("stun")) return;
  if (isHero) {
    if (!player.canAttack() || isDead || isAttacking || !isHoldingAttack) return;
    if (!player.canCastSpell(abilitySlot)) return;
    if (!hasStaminaForAttack(player, count, abilitySlot)) return;
  }

  const { action, spellName } = player.getAttackActionName({ count, abilitySlot });

  state.lastAttackCount = count;
  if (isHero) window.dispatchEvent(new CustomEvent("HERO_ATTACK_COUNT", { detail: count }));
  state.isAttacking = true;
  state.lastAttack = Date.now();
  player.action = action;
  player.direction = direction || player.direction;

  // If we are the hero, need to trigger the socket that we attacked
  if (isHero) {
    player.scene.socket.emit("attack", {
      count,
      direction: player.direction,
      castAngle,
      abilitySlot,
    });
  }

  playAttackLunge(player, player.direction);
  // draw our physical animation.
  player.scene.add.existing(
    new Spell(player.scene, { id: null, caster: player, spellName, castAngle, action }),
  );
}

function holdCastPose(player: Player, ms: number) {
  const action = getCastAction(player);
  if (action) player.castPose = { action, until: Date.now() + ms };
}

/** A timed spell began: the attack frame holds and the ring fills until it lands. */
export function beginCast(player: Player, castMs: number) {
  player.isCasting = true;
  holdCastPose(player, castMs);
  playWindupPie(player, castMs, "cast");
}

/** The timed spell stopped, by landing or being cancelled. */
export function endCast(player: Player) {
  player.isCasting = false;
  player.castPose = undefined;
  stopWindupPie(player);
}

/** A timed spell fired. The server has charged for it, so this only draws it. */
export function landCast(player: Player, { abilitySlot, castAngle }: CastArgs) {
  endCast(player);
  holdCastPose(player, CAST_POSE_MS);
  const ability = player.getAbilityDetails(abilitySlot);
  /* The aim was faced for the whole cast; once it fires the hero is free to turn */
  player.scene.add.existing(new Spell(player.scene, { ...ability, castAngle, caster: player }));
}

export function doCast(player: Player, { abilitySlot, castAngle }: CastArgs) {
  const { isHero } = player || {};
  const ability = player.getAbilityDetails(abilitySlot);

  if (isHero) {
    if (!player.canCastSpell(abilitySlot)) return;
    if (player?.hasBuff("stun")) return;
    player.scene.socket.emit("castSpell", { abilitySlot, castAngle });
  }
  holdCastPose(player, CAST_POSE_MS);
  const isDash = ability.spell.delivery.type === "dash";
  /* Lunges dash the caster: the hero moves itself, others just leave the trail */
  if (isDash) {
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
