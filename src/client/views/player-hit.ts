import type { HitMessage } from "@/network/messages";
import type { Player } from "./player";
import { Damage } from "./damage";
import { Buff } from "./buff";
import { Hit } from "./hit";
import { playDeathDissolve } from "./dissolve";

/** How long a hit paints the body solid white before the red tint, in ms. */
const WHITE_FLASH_MS = 50;

/** A hit as the client plays it. Regen and stat changes have no attacker or target. */
export type HitEffect = Pick<HitMessage, "type"> & Partial<Omit<HitMessage, "type">>;

/**
 * Plays one hit (damage, buff, death, stat change) on a character. The numbers themselves come
 * from the client state's vitals; a sprite never writes them.
 */
export function applyHit(player: Player, hit: HitEffect, showDamage = true) {
  if (player?.state?.isDead) return;

  const { scene } = player || {};
  const { type, elements } = hit || {};
  const isDamage = (hit?.amount ?? 0) < 0;

  if (showDamage) {
    scene.add.existing(new Damage(player.scene, player, hit));
  }

  switch (type) {
    case "buff":
      scene.add.existing(new Buff(player.scene, player, hit?.buffName as string));
      break;
    case "death":
      scene.add.existing(new Hit(player.scene, player, elements));
      playDeathDissolve(player);
      player.doDeath();
      break;
    case "hp":
      if (isDamage) {
        scene.add.existing(new Hit(player.scene, player, elements));
        flashHit(player);
      } else {
        if (elements?.includes("holy") && !hit?.isDrain) {
          scene.add.existing(new Hit(player.scene, player, elements));
        }
      }
      break;
    case "exp":
      // we don't update EXP the same way
      break;
  }

  /* Not sure events like player is the best approach */
  if (player?.isHero) {
    window.dispatchEvent(new Event("UPDATE_HUD"));
  }
}

/** A solid white impact frame, then the red damage tint (cleared by `checkIsFlash`). */
function flashHit(player: Player) {
  player.doFlashAnimation(0xffffff, true);
  player.state.lastFlash = Date.now() + WHITE_FLASH_MS;
  player.state.isFlash = true;
  player.scene.time.delayedCall(WHITE_FLASH_MS, () => {
    /* Skip it if the flash already ended, or the red would stick until the next hit */
    if (!player.active || player.state.isDead || !player.state.isFlash) return;
    player.doFlashAnimation(0xff0000);
  });
}
