import Phaser from "phaser";
import type { CellAt } from "./extras-props";

/**
 * Outlines each `Extras` prop, one color each, with a line at its foot, and the hero's sort line in
 * white: you go behind a prop when the white line is above its line. On with `DEBUG_EXTRAS=true`.
 */
export function debugExtras(
  scene: Phaser.Scene & { hero?: Phaser.GameObjects.Container },
  props: { cells: CellAt[]; foot: number }[],
  tile: { width: number; height: number },
) {
  const g = scene.add.graphics().setDepth(Number.MAX_SAFE_INTEGER - 1);
  props.forEach(({ cells, foot }, i) => {
    const color = Phaser.Display.Color.HSVToRGB((i * 0.618) % 1, 0.9, 1).color;
    g.lineStyle(1, color, 0.9);
    for (const [r, c] of cells)
      g.strokeRect(c * tile.width + 1, r * tile.height + 1, tile.width - 2, tile.height - 2);
    const columns = cells.map(([, c]) => c);
    const left = Math.min(...columns) * tile.width;
    const right = (Math.max(...columns) + 1) * tile.width;
    g.lineStyle(2, color, 1).lineBetween(left, foot, right, foot);
  });
  const hero = scene.add.graphics().setDepth(Number.MAX_SAFE_INTEGER);
  const draw = () => {
    hero.clear();
    const player = scene.hero;
    if (!player) return;
    const y = player.depth - 100;
    hero.lineStyle(2, 0xffffff, 1).lineBetween(player.x - 16, y, player.x + 16, y);
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, draw);
  return () => {
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, draw);
    g.destroy();
    hero.destroy();
  };
}
