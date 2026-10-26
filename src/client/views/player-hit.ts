import type { HitMessage } from "@/shared/network";
import type { Player } from "./player";
import { Damage } from "./damage";
import { Buff } from "./buff";
import { Hit } from "./hit";

/** A hit as the client plays it. Regen and stat changes have no attacker or target. */
export type HitEffect = Pick<HitMessage, "type"> & Partial<Omit<HitMessage, "type">>;

/** Applies one hit (damage, buff, death, stat change) to a character and plays its effects. */
export function applyHit(player: Player, hit: HitEffect, showDamage = true) {
  if (player?.state?.isDead) return;

  const { stats, scene } = player || {};
  const { type, elements } = hit || {};
  const isDamage = hit?.amount < 0;

  if (showDamage) {
    scene.add.existing(new Damage(player.scene, player, hit));
  }

  switch (type) {
    case "buff":
      scene.add.existing(new Buff(player.scene, player, hit?.buffName));
      break;
    case "death":
      stats.hp = 0;
      scene.add.existing(new Hit(player.scene, player, elements));
      player.doDeath();
      break;
    case "hp":
      player.modifyStat("hp", hit?.amount);
      if (isDamage) {
        scene.add.existing(new Hit(player.scene, player, elements));
        player.doFlashAnimation("0xFF0000");
        player.state.lastFlash = Date.now();
        player.state.isFlash = true;
      } else {
        if (elements?.includes("holy")) {
          scene.add.existing(new Hit(player.scene, player, elements));
        }
      }
      break;
    case "mp":
      player.modifyStat("mp", hit?.amount);
      break;
    case "sp":
      player.modifyStat("sp", hit?.amount);
      break;
    case "exp":
      // we don't update EXP the same way
      break;
  }

  /* Not sure events like player is the best approach */
  if (player?.isHero) {
    window.dispatchEvent(new Event("UPDATE_HUD"));
  }

  player.updateHpBar();
}
