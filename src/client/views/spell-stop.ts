import { areAllies } from "@/rules/allegiance";
import { findSpellHits, getSpell, piercesThrough, takeHits, toSpellVictims } from "@/rules/spells";
import { isBallSpell } from "./ball-sheet";
import type { Player } from "./player";

/** What a flying spell on screen needs to know whether it has stopped on someone. */
interface FlyingSpell {
  scene: Phaser.Scene;
  x: number;
  y: number;
  scale: number;
  bodySize: number;
  spellName: string;
  caster: Player;
  /** What it's drawn as: a thrown ball's frame carries on as the ball its target struggles in. */
  spell: Phaser.GameObjects.Sprite;
}

/** The side a character on screen is on (`rules/allegiance`). Players go by socket id. */
const sideOf = (c: Player) => ({
  id: c.kind === "player" ? c.socketId || c.id : c.id,
  isPlayer: c.kind === "player",
  ownerId: c.state?.ownerId,
});

/**
 * Who a spell that doesn't pierce has reached and stops on, if anyone, by the same rules the server
 * uses (`takeHits`), so it stops where the server stops it instead of flying on through them. The
 * server alone decides what the hit does.
 */
function stoppedOn(spell: FlyingSpell): Player | undefined {
  const definition = getSpell(spell.spellName);
  if (piercesThrough(definition)) return undefined;
  /* Straight from the scene's groups: its entity helpers import the views, this among them */
  const { npcs, players } = spell.scene as {
    npcs?: Phaser.GameObjects.Group;
    players?: Phaser.GameObjects.Group;
  };
  const characters = [...(npcs?.getChildren() ?? []), ...(players?.getChildren() ?? [])].filter(
    (c) => c.active,
  ) as Player[];
  const { caster } = spell;
  const radius = Math.floor(spell.bodySize * spell.scale);
  const overlapped = findSpellHits({
    shape: { kind: "circle", x: spell.x, y: spell.y, radius },
    victims: toSpellVictims(characters),
    hitIds: [],
    allowedTargets: definition.targets,
    caster: { id: caster.id, x: caster.x, y: caster.y, isPlayer: caster.kind === "player" },
    isMeleeAttack: false,
  });
  const mayTouch = (id: string) => {
    const victim = characters.find((c) => c.id === id);
    if (!victim) return false;
    const isOnSide = areAllies(sideOf(caster), sideOf(victim));
    return definition.targets.includes(isOnSide ? "ally" : "enemy");
  };
  const [stopper] = takeHits(overlapped, { pierces: false, mayTouch }).hits;
  return characters.find((c) => c.id === stopper);
}

/**
 * Whether a spell that doesn't pierce has stopped on someone (see `stoppedOn`). A thrown ball that
 * did is handed to them, so it stays on screen until the capture it starts shows.
 */
export function hasStoppedOnSomeone(spell: FlyingSpell) {
  const stopper = stoppedOn(spell);
  if (stopper && isBallSpell(spell.spellName)) stopper.captureBall?.catchThrown(spell.spell);
  return !!stopper;
}
