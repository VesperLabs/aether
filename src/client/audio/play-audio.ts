import { distanceTo } from "@/shared/rules/world";

/* TODO: Move to DB */
const SFX_VOLUME = 0.25;

export const playAudio = ({ scene, audioKey, caster }) => {
  const heroPosition = scene.hero?.body?.position;
  const casterPosition = { x: caster?.x, y: caster?.y };

  if (!audioKey) return;
  const audio = scene.sound.get(audioKey) || scene.sound.add(audioKey);

  // Calculate the distance between the hero and the caster
  const distance = distanceTo(heroPosition, casterPosition);

  // Adjust the volume based on the distance (example formula)
  const maxDistance = 500; // adjust this as needed
  const volume = SFX_VOLUME * (1 - distance / maxDistance);
  audio.setVolume(volume);

  audio.play();
};
