import Phaser from "phaser";
import type { SceneMain } from "./main-scene";

export function calculateZoomLevel({
  viewportArea = 0,
  baseZoom = 2,
  maxZoom = 4,
  divisor = 1000000,
} = {}) {
  const viewportAreaInPixels = viewportArea; // multiply by square of pixel density
  const zoomLevel = Phaser.Math.Clamp(
    baseZoom + viewportAreaInPixels / divisor,
    baseZoom,
    maxZoom,
  ).toFixed(2);
  return zoomLevel;
}

export function getGameZoomLevel(scene: Phaser.Scene) {
  const viewportArea = scene.cameras.main.width * scene.cameras.main.height;
  return Math.round(parseInt(calculateZoomLevel({ viewportArea })));
}

export function getHeroCoordsRelativeToWindow(scene: Phaser.Scene) {
  const mainScene = scene?.scene?.manager?.getScene("SceneMain") as SceneMain;
  const zoomLevel = getGameZoomLevel(mainScene);
  const camera = mainScene.cameras.main;
  const hero = mainScene?.hero;

  if (!hero) return { x: 0, y: 0 };

  // Calculate the hero's position relative to the camera
  const x = (hero.x - camera.worldView.x) * zoomLevel;
  const y = (hero.y - camera.worldView.y) * zoomLevel;

  return { x, y };
}
