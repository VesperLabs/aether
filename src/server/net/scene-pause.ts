/** Pauses the game loop while nobody is connected and resumes it when someone joins. */
export function shouldPause(scene: ServerScene) {
  if (Object.keys(scene.players ?? {})?.length === 0) {
    scene.scene.pause();
    console.log("🚦 Game empty. Pausing.");
  } else {
    scene.scene.resume();
    console.log("🚦 Player joined. Resuming.");
  }
}
