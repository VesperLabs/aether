import { getMapByName } from "@/shared/content";

/* TODO: Move to DB */
export const MUSIC_VOLUME = 0.05;

export function changeMusic(scene) {
  if (!scene.userSettings.playMusic) return; // user does not want music
  const track = getMapByName(scene?.roomName)?.music;
  if (!track) return;
  let sound = scene.sound.get(track);
  if (sound && sound.isPlaying) {
    // Sound is already playing, do nothing
    return;
  }
  scene.sound.stopAll();
  scene.load.audio(track, [track]);
  scene.load.once("complete", () => {
    sound = scene.sound.get(track);
    if (!sound) {
      sound = scene.sound.add(track, { volume: MUSIC_VOLUME, loop: true });
    }
    sound.play();
  });
  scene.load.start();
}
