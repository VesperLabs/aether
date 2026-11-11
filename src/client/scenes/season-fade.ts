import Phaser from "phaser";
import type { SceneMain } from "./main-scene";
import { ABOVE_LAYER_DEPTH } from "./world-depths";

/** How long the old season takes to fade away. */
const FADE_MS = 1500;
/** Extra snapshot around the screen, so walking during the fade doesn't show its edge. */
const MARGIN = 0.5;
/** The map's drawn layers, bottom to top (see `changeMap`). */
const ART_LAYERS = ["Ground", "Shadows", "Overlay", "Extras", "Above"];

let fading: Phaser.GameObjects.RenderTexture[] = [];

const clearFade = () => {
  for (const snapshot of fading) snapshot.destroy();
  fading = [];
};

/** The visible part of `layers` drawn once into a texture, sitting where they are in the world. */
function snapshot(scene: SceneMain, layers: Phaser.Tilemaps.TilemapLayer[], depth: number) {
  const view = scene.cameras.main.worldView;
  const x = Math.floor(view.x - view.width * MARGIN);
  const y = Math.floor(view.y - view.height * MARGIN);
  const width = Math.ceil(view.width * (1 + 2 * MARGIN));
  const height = Math.ceil(view.height * (1 + 2 * MARGIN));
  const texture = scene.add.renderTexture(x, y, width, height).setOrigin(0, 0).setDepth(depth);
  for (const layer of layers) texture.draw(layer, layer.x - x, layer.y - y);
  texture.render();
  scene.minimap?.ignore(texture);
  return texture;
}

/**
 * Changes the map's look with the old one fading out over it, instead of snapping. Only the tile
 * layers are snapshotted (characters stay live and sharp), and only for as long as the fade runs.
 * `swap` changes the tilesets; it runs after the snapshot has been drawn, a frame later.
 */
export function fadeMapChange(scene: SceneMain, swap: () => void) {
  clearFade();
  /* The art layers only, in drawing order: never `Collide`, which the ground hides in game */
  const layers = ART_LAYERS.map((name) => scene.map.getLayer(name)?.tilemapLayer).filter(
    (layer): layer is Phaser.Tilemaps.TilemapLayer => !!layer,
  );
  const below = layers.filter((layer) => layer.depth < ABOVE_LAYER_DEPTH);
  const above = layers.filter((layer) => layer.depth >= ABOVE_LAYER_DEPTH);
  /* Just over the layers each one covers */
  fading = [
    snapshot(scene, below, Math.max(...below.map((layer) => layer.depth)) + 0.5),
    ...(above.length ? [snapshot(scene, above, ABOVE_LAYER_DEPTH + 0.5)] : []),
  ];

  /* The snapshot draws during the next render; swap only once it has, or it shows the new season */
  scene.events.once(Phaser.Scenes.Events.RENDER, () => {
    swap();
    const snapshots = fading;
    scene.tweens.add({
      targets: snapshots,
      alpha: 0,
      duration: FADE_MS,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (fading === snapshots) clearFade();
      },
    });
  });
  scene.events.once("shutdown", clearFade);
}
