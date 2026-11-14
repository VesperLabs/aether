import { useEffect, useState } from "react";
import type { BuiltItem } from "@/content";
import { itemEffects } from "@/content";
import { ELEMENT_PAD, ElementalSprite } from "@/ui/item";
import weaponAtlas from "../../../public/assets/atlas/weapon.json";
import { loadSheet } from "./sprite-sheet";

/** A held weapon's frame: 100px square, held at its middle. */
const WEAPON_SIZE = 100;
const GRIP = { x: WEAPON_SIZE / 2, y: WEAPON_SIZE / 2 };
/** The character canvas is drawn at twice its pixels (see `PlayerRender`). */
const SCALE = 2;
/** How far below the canvas's middle the hands are, in its pixels (see `drawLayers`). */
const HAND_DROP = 14;
/**
 * Where the grip sits in the layer `ElementalSprite` draws, in screen pixels: the point that must
 * land on the hand, and that the weapon turns about.
 */
const GRIP_IN_LAYER = (ELEMENT_PAD + GRIP.x) * SCALE;

type WeaponPose = { x: number; y: number; flipX?: boolean; flipY?: boolean; rotation?: number };
type WeaponOffsets = { left: WeaponPose; right: WeaponPose };

/** A weapon in a character's hand, as the picture draws it. */
export interface HeldWeapon {
  hand: "handLeft" | "handRight";
  item: BuiltItem;
  src: string;
  tint?: string;
  /** In front of the body this frame, or behind it (its effects go under the picture). */
  inFront: boolean;
}

/** The weapon's art tinted as the picture draws it, as an image the sprite can load. */
const useTintedArt = (src: string, tint?: string) => {
  const [art, setArt] = useState<string>();
  useEffect(() => {
    let current = true;
    loadSheet({ src, tint }).then((canvas) => {
      if (current && canvas) setArt(canvas.toDataURL());
    });
    return () => {
      current = false;
    };
  }, [src, tint]);
  return art;
};

const HandEffects = ({ weapon, pose }: { weapon: HeldWeapon; pose: WeaponPose }) => {
  const art = useTintedArt(weapon.src, weapon.tint);
  const elements = itemEffects(weapon.item);
  if (!art || elements.length === 0) return null;
  const { x, y, flipX, flipY, rotation = 0 } = pose;
  return (
    <ElementalSprite
      src={art}
      width={WEAPON_SIZE}
      height={WEAPON_SIZE}
      scale={SCALE}
      elements={elements}
      grip={GRIP}
      layerSx={{
        position: "absolute",
        left: `calc(50% + ${x * SCALE - GRIP_IN_LAYER}px)`,
        top: `calc(50% + ${(y + HAND_DROP) * SCALE - GRIP_IN_LAYER}px)`,
        transformOrigin: `${GRIP_IN_LAYER}px ${GRIP_IN_LAYER}px`,
        transform: `rotate(${rotation}deg) scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`,
      }}
    />
  );
};

/**
 * The elemental effects (outline, flames, drips, bolts...) of the weapons in a character's hands,
 * where `drawLayers` drew each weapon, turned and flipped the same way. The weapon is drawn again
 * on top of its effects, as in the game: the same pixels as the picture's. Rendered twice: under
 * the picture for hands behind the body (which then covers them), over it for hands in front.
 */
export const WeaponEffects = ({
  weapons,
  frame,
  inFront,
}: {
  weapons: readonly HeldWeapon[];
  /** Which hands this pass draws: those in front of the body, or those behind it. */
  inFront: boolean;
  /** The walk frame the picture is drawn in (`down-stand` when still). */
  frame: string;
}) => {
  const atlas = (weaponAtlas.offsets.human as Record<string, WeaponOffsets>)[frame];
  if (!atlas) return null;
  return weapons
    .filter((weapon) => weapon.inFront === inFront)
    .map((weapon) => (
      <HandEffects
        key={weapon.hand}
        weapon={weapon}
        pose={weapon.hand === "handLeft" ? atlas.left : atlas.right}
      />
    ));
};
