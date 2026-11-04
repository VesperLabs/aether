import { distanceTo, type Point } from "@/rules/world";
import type { SceneMain } from "@/client/scenes/main-scene";

/** Loudest a sound effect gets (slider at 100%). */
const MAX_SFX_GAIN = 0.5;
/** Each play is pitched up or down by up to this many cents, so repeats don't sound robotic. */
const SFX_DETUNE_CENTS = 120;

export const playAudio = ({
  scene,
  audioKey,
  caster,
}: {
  scene: Phaser.Scene;
  audioKey: string | null;
  caster: Point;
}) => {
  const { hero, userSettings } = scene as SceneMain;
  if (!userSettings.playSfx) return;
  const heroPosition = hero?.body?.position;
  const casterPosition = { x: caster?.x, y: caster?.y };

  if (!audioKey) return;
  const audio = (scene.sound.get(audioKey) ||
    scene.sound.add(audioKey)) as Phaser.Sound.WebAudioSound;

  // Calculate the distance between the hero and the caster
  const distance = distanceTo(heroPosition, casterPosition);

  // Adjust the volume based on the distance (example formula)
  const maxDistance = 500; // adjust this as needed
  const volume = MAX_SFX_GAIN * userSettings.sfxVolume * (1 - distance / maxDistance);
  audio.setVolume(volume);
  audio.setDetune((Math.random() * 2 - 1) * SFX_DETUNE_CENTS);

  audio.play();
};
