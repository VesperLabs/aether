import type { SceneMain } from "@/client/scenes/main-scene";

/** Loudest thunder gets (sound effects slider at 100%), close by. */
const MAX_GAIN = 0.6;
/** Seconds of rumble kept as noise, long enough for the slowest roll. */
const NOISE_SECONDS = 5;

/** One buffer of brown noise, shared by every clap: rough low rumble, made once. */
let noise: AudioBuffer | undefined;

function noiseOf(context: AudioContext) {
  if (noise?.sampleRate === context.sampleRate) return noise;
  noise = context.createBuffer(1, context.sampleRate * NOISE_SECONDS, context.sampleRate);
  const data = noise.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    /* Brown noise: each sample a small random step from the last, so it rumbles rather than hisses */
    last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02;
    data[i] = last * 3.5;
  }
  return noise;
}

/**
 * Rolls thunder after a flash, made from filtered noise rather than a sound file. A strike `nearness`
 * from 0 (far) to 1 (close) comes sooner, louder and sharper; a far one is late, soft and low.
 */
export function playThunder(scene: SceneMain, nearness: number) {
  const { hero, userSettings } = scene;
  /* Observers watch in silence: there is no hero to hear it */
  if (!hero || !userSettings.playSfx) return;
  const sound = scene.sound as Phaser.Sound.WebAudioSoundManager;
  const context = sound.context;
  if (!context || context.state !== "running") return;

  const delay = 0.3 + (1 - nearness) * 2.5;
  const duration = 2 + (1 - nearness) * 2.5;
  const start = context.currentTime + delay;
  const source = context.createBufferSource();
  source.buffer = noiseOf(context);
  source.playbackRate.value = 0.8 + Math.random() * 0.4;

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(260 + nearness * 900, start);
  filter.frequency.exponentialRampToValueAtTime(90, start + duration);

  const gain = context.createGain();
  const peak = MAX_GAIN * userSettings.sfxVolume * (0.35 + nearness * 0.65);
  gain.gain.setValueAtTime(0.0001, start);
  /* A close clap cracks at once; a far one swells in */
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.04 + (1 - nearness) * 0.5);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter).connect(gain).connect(context.destination);
  source.start(start, Math.random() * (NOISE_SECONDS - duration - 0.1));
  source.stop(start + duration);
}
