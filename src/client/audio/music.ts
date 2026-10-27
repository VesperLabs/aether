import { getMapByName } from "@/content";
import type { SceneMain } from "@/client/scenes/main-scene";

/* TODO: Move to DB */
export const MUSIC_VOLUME = 0.05;

const ASSETS_BASE = process.env.ASSETS_URL || "";
const assetUrl = (src: string) =>
  ASSETS_BASE ? src.replace(/^\.\/assets\//, ASSETS_BASE + "/") : src;

export function changeMusic(scene: SceneMain) {
  if (!scene.userSettings.playMusic) return; // user does not want music
  const track = getMapByName(scene?.roomName)?.music;
  if (!track) return;
  let sound: Phaser.Sound.BaseSound | null = scene.sound.get(track);
  if (sound && sound.isPlaying) {
    // Sound is already playing, do nothing
    return;
  }
  scene.sound.stopAll();
  scene.load.audio(track, [assetUrl(track)]);
  scene.load.once("complete", () => {
    sound = scene.sound.get(track);
    if (!sound) {
      sound = scene.sound.add(track, { volume: MUSIC_VOLUME, loop: true });
    }
    sound.play();
  });
  scene.load.start();
}
