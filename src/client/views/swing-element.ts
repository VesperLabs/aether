import type { SpellLook } from "@/content";
import { itemEffects } from "@/content";
import { ELEMENT_SWING_COLORS } from "@/ui/item/element-effects";
import type { Player } from "./player";
import { toTint } from "./tint";
import type { WeaponSprite } from "./weapon-sprite";

/** A plain swing's arc, from a weapon with no element. */
const PLAIN_SWING_COLOR = 0xdfe8ff;

/**
 * A swing's arc colour: the spell's tint, else its element (Flame Slash), else the weapon's first
 * mod effect, like its outline. A spell with an element also sets the blade alight for `ms`.
 */
export function swingColor(
  look: SpellLook,
  caster: Player,
  hand: "handLeft" | "handRight",
  ms: number,
) {
  const effect = look.weaponElement ?? itemEffects(caster.visibleEquipment?.[hand])[0];
  if (look.weaponElement) (caster[hand] as WeaponSprite).flashElement?.(look.weaponElement, ms);
  return (
    (look.tint ? toTint(look.tint) : undefined) ??
    (effect && ELEMENT_SWING_COLORS[effect]) ??
    PLAIN_SWING_COLOR
  );
}
