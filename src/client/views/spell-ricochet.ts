import { moveRicocheting } from "@/rules/movement";
import { getSpell } from "@/rules/spells";
import { distanceTo, type Point } from "@/rules/world";
import { wallsOf } from "@/client/scenes/ground-terrain";

/** What a spell on screen needs to bank off walls (`ricochet`) the way the server's does. */
interface FlyingSpell {
  scene: Phaser.Scene;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  spawnPoint: Point;
  ricochet?: { depth: number; bounciness?: number };
  /** How far below it its ground point is, where it meets walls. */
  groundOffset: number;
  /** How far it has flown, bounces and all. */
  travelled: number;
}

/**
 * Flies a ricocheting spell `seconds` on, by the same rule the server uses, so it bounces where the
 * server's does. Returns false for one that doesn't ricochet: the physics body flies those.
 */
export function flyRicocheting(spell: FlyingSpell, seconds: number) {
  const { ricochet } = spell;
  if (!ricochet) return false;
  const walls = wallsOf((spell.scene as { map?: Phaser.Tilemaps.Tilemap }).map);
  /* Its map not read yet: straight on, as any other spell flies */
  if (!walls) {
    const step = Math.hypot(spell.velocityX, spell.velocityY) * seconds;
    spell.x += spell.velocityX * seconds;
    spell.y += spell.velocityY * seconds;
    spell.travelled += step;
    return true;
  }
  const flown = moveRicocheting(walls, spell, { x: spell.velocityX, y: spell.velocityY }, seconds, {
    depth: ricochet.depth,
    bounciness: ricochet.bounciness,
    groundOffset: spell.groundOffset,
  });
  spell.velocityX = flown.velocity.x;
  spell.velocityY = flown.velocity.y;
  spell.travelled += flown.distance;
  return true;
}

/** How far a spell has got, for its range: along its bounces for a ricochet, else from its start. */
export const distanceFlown = (spell: FlyingSpell) =>
  spell.ricochet ? spell.travelled : distanceTo(spell, spell.spawnPoint);

/**
 * An upright spell (a ball) rolls the way it is going: mirrored while it heads left, so it never
 * seems to skid back off a wall, and tumbling as fast as it flies, slower after each bounce.
 */
export function rollWithFlight(spell: {
  spell: Phaser.GameObjects.Sprite;
  spellName: string;
  velocityX: number;
  velocityY: number;
}) {
  const { delivery, look } = getSpell(spell.spellName);
  if (!look.upright) return;
  if (spell.velocityX) spell.spell.setFlipX(spell.velocityX < 0);
  const fullSpeed = "speed" in delivery ? delivery.speed : 0;
  if (fullSpeed) {
    spell.spell.anims.timeScale = Math.hypot(spell.velocityX, spell.velocityY) / fullSpeed;
  }
}
