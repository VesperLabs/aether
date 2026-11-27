import Phaser from "phaser";
import type { Player } from "./player";

/** Over every body and prop, so a character in front never hides another's bars. */
const OVERHEAD_DEPTH = 1_000_000;

/** A layer of its own in the scene for a character's hp and cast bars, gone with the character. */
export function createOverheadBars(player: Player) {
  const bars = player.scene.add
    .existing(new Phaser.GameObjects.Container(player.scene, player.x, player.y))
    .setDepth(OVERHEAD_DEPTH);
  bars.add([player.hpBar, player.castBar]);
  /*
   * After every update (physics, interpolation, lunges), so they sit where the body is drawn this
   * frame rather than a step behind it, which made them jitter
   */
  const { events } = player.scene;
  const follow = () => followOverheadBars(player, bars);
  events.on(Phaser.Scenes.Events.POST_UPDATE, follow);
  player.once(Phaser.GameObjects.Events.DESTROY, () => {
    events.off(Phaser.Scenes.Events.POST_UPDATE, follow);
    bars.destroy();
  });
  return bars;
}

/** Keeps the bars over the body, through lunges and flinches, and as faded as it is. */
function followOverheadBars(player: Player, bars: Phaser.GameObjects.Container) {
  const { rig } = player;
  bars.setPosition(player.x + rig.x, player.y + rig.y);
  bars.setVisible(player.visible);
  bars.setAlpha(player.alpha);
}

/** How long a bar takes to fade out once it's no longer needed, ms. */
const BAR_FADE_MS = 250;

/** Shows a bar at once, or fades it out over `BAR_FADE_MS` rather than popping it away. */
export function fadeBar(bar: Phaser.GameObjects.Image, show: boolean, deltaMs: number) {
  if (show) {
    bar.setVisible(true).setAlpha(1);
    return;
  }
  if (!bar.visible) return;
  const alpha = bar.alpha - deltaMs / BAR_FADE_MS;
  bar.setAlpha(Math.max(0, alpha)).setVisible(alpha > 0);
}
