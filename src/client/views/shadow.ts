import { currentHabitat, getBody, shadowOf, shadowPixels, type ShadowShape } from "@/content";
import { seedFromString } from "@/rules/world";
import type { Player } from "./player";

/** How much a flier's shadow grows and shrinks as it bobs, and how long one bob takes. */
const PULSE = 0.08;
const PULSE_MS = 900;

/** The oval's texture, made once per size and opacity and shared by every body that casts it. */
function shadowTexture(scene: Phaser.Scene, shape: ShadowShape): string {
  const key = `shadow-${shape.width}x${shape.height}-${shape.opacity.toFixed(3)}`;
  if (scene.textures.exists(key)) return key;
  const canvas = scene.textures.createCanvas(key, shape.width, shape.height);
  if (!canvas) return key;
  const image = canvas.context.createImageData(shape.width, shape.height);
  image.data.set(shadowPixels(shape));
  canvas.context.putImageData(image, 0, 0);
  canvas.refresh();
  return key;
}

/** The habitat each character's shadow was last placed for. */
const placedIn = new WeakMap<Player, unknown>();

/** Sizes the shadow to the character's body where it is (a flier's sits lower) and puts it at its feet. */
export function placeShadow(player: Player) {
  const race = player.profile?.race;
  placedIn.set(player, player.state?.habitat);
  const shape = shadowOf({
    ...getBody(race),
    habitat: currentHabitat(race, player.state?.habitat),
  });
  player.shadow.setTexture(shadowTexture(player.scene, shape));
  player.shadow.setPosition(0, shape.below).setScale(player.profile?.scale || 1);
}

/**
 * Follows a body that switches habitat (a bird taking off or landing), so it stops wading and
 * leaving footprints in the air and its shadow drops. Others keep the habitat the server sent.
 */
export function followHabitat(player: Player) {
  if (getBody(player.profile?.race).habitats.length < 2) return;
  if (placedIn.get(player) === player.state?.habitat) return;
  player.habitat = currentHabitat(player.profile?.race, player.state?.habitat);
  placeShadow(player);
}

/** A flier's shadow swells and shrinks a little, as if it bobs up and down over it. */
export function pulseShadow(player: Player, now: number) {
  if (currentHabitat(player.profile?.race, player.state?.habitat) !== "air") return;
  /* Each its own phase, so a swarm doesn't bob as one */
  const phase = seedFromString(String(player.id ?? "")) % 100;
  const bob = 1 + PULSE * Math.sin((now / PULSE_MS) * Math.PI * 2 + phase);
  player.shadow.setScale((player.profile?.scale || 1) * bob);
}
