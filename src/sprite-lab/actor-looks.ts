import { actors, findDefinition, type ActorDefinition, type BuiltItem } from "@/content";
import { getPlayerEquipmentAssets, type RenderablePlayer } from "@/ui";
import {
  BASE_SHEETS,
  formatLook,
  getLayerSheets,
  HUMAN_LAYERS,
  WEAPON_SHEETS,
  type HumanLayer,
} from "./sheets";

/**
 * What the lab needs to show a character: its body, each worn layer (both `texture|tint` when
 * tinted, as dyed hair or a coloured item is) and the weapon in hand.
 */
export type ActorLook = { atlas: string; layers: Record<HumanLayer, string>; weapon: string };

/** An actor as the game's renderer reads it: its profile and the items its equipment names. */
export const toRenderable = (actor: ActorDefinition): RenderablePlayer => {
  const equipment = Object.fromEntries(
    Object.entries(actor.equipment ?? {}).map(([slot, ref]) => {
      const [type, rarity, key] = (ref ?? []) as string[];
      return [slot, ref ? (findDefinition(type, rarity, key).item as BuiltItem) : null];
    }),
  );
  return {
    profile: actor.profile,
    equipment,
    /* The renderer only draws slots listed here. */
    activeItemSlots: Object.keys(equipment).filter((slot) => equipment[slot]),
  };
};

/**
 * An actor's look in the lab's terms, through the game's own renderer so what it hides (hair under
 * a helmet) matches the game. Undefined for one drawn on a body the lab can't open.
 */
const getActorLook = (actor: ActorDefinition): ActorLook | undefined => {
  const assets = getPlayerEquipmentAssets({ player: toRenderable(actor) });
  const part = (key: string) => assets.find(({ slotKey }) => slotKey === key);
  const worn = (key: string) => part(key)?.texture;
  const skin = part("skin");
  if (!skin || !BASE_SHEETS.some(({ texture }) => texture === skin.texture)) return undefined;
  const atlas = formatLook({ texture: skin.texture, tint: skin.tint });
  const layers = Object.fromEntries(
    HUMAN_LAYERS.map((layer) => {
      const asset = part(layer);
      const known = getLayerSheets(layer).some((sheet) => sheet.texture === asset?.texture);
      return [
        layer,
        asset && known ? formatLook({ texture: asset.texture, tint: asset.tint }) : "",
      ];
    }),
  ) as Record<HumanLayer, string>;
  /* The lab holds one weapon: the right hand's, else the left's. */
  const weapon =
    [worn("handRight"), worn("handLeft")].find((texture) =>
      WEAPON_SHEETS.some((sheet) => sheet.texture === texture),
    ) ?? "";
  return { atlas, layers, weapon };
};

/** `chetTheMerchant` as `chet-the-merchant`, for file names. */
export const toKebab = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** Every actor the lab can show, keepers (the ones you can talk to) first, then by name. */
export const LAB_ACTORS = Object.entries(actors as Record<string, ActorDefinition>)
  .flatMap(([key, actor]) => {
    const look = getActorLook(actor);
    return look ? [{ key, actor, look, isKeeper: !!actor.dialogues }] : [];
  })
  .sort(
    (a, b) =>
      Number(b.isKeeper) - Number(a.isKeeper) ||
      a.actor.profile.userName.localeCompare(b.actor.profile.userName),
  );

/** Whether the lab is showing exactly this look, so the picker can name it. */
export const isShowingLook = (
  look: ActorLook,
  shown: { atlas: string; layers: Record<HumanLayer, string>; weapon: string },
) =>
  look.atlas === shown.atlas &&
  look.weapon === shown.weapon &&
  (!look.atlas.startsWith("human") ||
    HUMAN_LAYERS.every((layer) => look.layers[layer] === shown.layers[layer]));
