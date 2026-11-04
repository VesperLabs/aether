import { getMapByName } from "@/content";
import { DEFAULT_USER_SETTINGS } from "@/rules/world";
import type { SceneMain } from "@/client/scenes/main-scene";

/** Loudest the music gets (slider at 100%); the tracks are mastered hot. */
const MAX_MUSIC_GAIN = 0.15;

/** Slider position (0 to 1) → Phaser volume. Squared so the low end has fine control. */
const musicGain = (sliderValue = DEFAULT_USER_SETTINGS.musicVolume) =>
  Math.min(1, Math.max(0, sliderValue)) ** 2 * MAX_MUSIC_GAIN;

export function setMusicVolume(scene: SceneMain, sliderValue: number) {
  scene.sound.getAllPlaying().forEach((s) => {
    if (s.key.includes("/music/"))
      (s as Phaser.Sound.WebAudioSound).setVolume(musicGain(sliderValue));
  });
}

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
      sound = scene.sound.add(track, {
        volume: musicGain(scene.userSettings.musicVolume),
        loop: true,
      });
    }
    /* A track revisited after a room change keeps the volume it had back then. */
    (sound as Phaser.Sound.WebAudioSound).setVolume(musicGain(scene.userSettings.musicVolume));
    sound.play();
  });
  scene.load.start();
}
