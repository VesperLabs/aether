import { getMapByName } from "@/content";
import { DEFAULT_USER_SETTINGS } from "@/rules/world";
import type { SceneMain } from "@/client/scenes/main-scene";

/** Loudest the music gets (slider at 100%); the tracks are mastered hot. */
const MAX_MUSIC_GAIN = 0.1;

/** Slider position (0 to 1) → Phaser volume. Squared so the low end has fine control. */
const musicGain = (sliderValue = DEFAULT_USER_SETTINGS.musicVolume) =>
  Math.min(1, Math.max(0, sliderValue)) ** 2 * MAX_MUSIC_GAIN;

const FADE_IN_MS = 1500;
const FADE_OUT_MS = 600;

const isMusic = (sound: Phaser.Sound.BaseSound) => sound.key.includes("/music/");
const playingMusic = (scene: SceneMain) =>
  scene.sound.getAllPlaying().filter(isMusic) as Phaser.Sound.WebAudioSound[];

const fadeTo = (
  scene: SceneMain,
  sound: Phaser.Sound.WebAudioSound,
  volume: number,
  duration: number,
  onComplete?: () => void,
) => {
  scene.tweens.killTweensOf(sound);
  /* Not sound.volume: it reads the gain node, which stays at 1 until the audio thread catches up. */
  const { currentConfig } = sound as unknown as { currentConfig: Phaser.Types.Sound.SoundConfig };
  const from = currentConfig.volume ?? 0;
  scene.tweens.add({ targets: sound, volume: { from, to: volume }, duration, onComplete });
};

export function setMusicVolume(scene: SceneMain, sliderValue: number) {
  playingMusic(scene).forEach((s) => {
    scene.tweens.killTweensOf(s);
    s.setVolume(musicGain(sliderValue));
  });
}

const ASSETS_BASE = process.env.ASSETS_URL || "";
const assetUrl = (src: string) =>
  ASSETS_BASE ? src.replace(/^\.\/assets\//, ASSETS_BASE + "/") : src;

export function changeMusic(scene: SceneMain) {
  if (!scene.userSettings.playMusic) return; // user does not want music
  const track = getMapByName(scene?.roomName)?.music;
  if (!track) return;
  const gain = musicGain(scene.userSettings.musicVolume);
  let sound: Phaser.Sound.BaseSound | null = scene.sound.get(track);
  if (sound && sound.isPlaying) {
    /* Already playing, though it may be fading out from a room left a moment ago */
    fadeTo(scene, sound as Phaser.Sound.WebAudioSound, gain, FADE_IN_MS);
    return;
  }
  playingMusic(scene).forEach((s) => fadeTo(scene, s, 0, FADE_OUT_MS, () => s.stop()));

  scene.load.audio(track, [assetUrl(track)]);
  scene.load.once("complete", () => {
    sound = scene.sound.get(track);
    sound ??= scene.sound.add(track, { volume: 0, loop: true });
    const music = sound as Phaser.Sound.WebAudioSound;
    music.setVolume(0);
    music.play();
    fadeTo(scene, music, gain, FADE_IN_MS);
  });
  scene.load.start();
}
