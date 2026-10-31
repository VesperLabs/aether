import { resolveAsset, type BuiltItem, type MobProfile } from "@/content";
import {
  ACCESSORY_HIDING_HELMETS,
  HAIR_HIDING_HELMETS,
  HAIR_HIDING_ACCESSORIES,
  FACE_HIDING_ACCESSORIES,
} from "@/content";
import { filterVisibleEquipment } from "@/rules/character";
import { tintCanvas, loadCacheImage } from "@/ui/kit";
import { memo, useEffect, useEffectEvent, useRef, type ComponentProps } from "react";
import type { CSSProperties } from "react";
import { Box } from "@/ui/kit";
import weaponAtlas from "../../../public/assets/atlas/weapon.json";

export const FULL_CANVAS_SIZE = 160;
const MIN_CANVAS_SIZE = 100;

export const PLAYER_RENDER_CANVAS_STYLE: CSSProperties = {
  zIndex: 0,
  transform: `translate(-50%, -50%) scale(2)`,
  imageRendering: "pixelated",
  position: "absolute",
  left: "50%",
  top: "50%",
};

type PlayerAsset = {
  tint?: string;
  texture: string;
  src: string;
  previewRect: number[];
  slot?: string;
  atlas?: string;
  slotKey?: string;
};

/** The parts of a character the renderer reads: how it looks and what it wears. */
export interface RenderablePlayer {
  profile?: MobProfile;
  equipment?: Record<string, BuiltItem | null | undefined>;
  activeItemSlots?: string[];
}

/** A look layer (hair, face...) built from the profile; it has no item behind it. */
type LookPart = { slot: string; texture?: string; tint?: string };

/** A layer's whole sprite sheet, tinted, ready to draw from. */
const drawImageOnNewCanvas = (image: HTMLImageElement, tint: string | undefined) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  return tint ? tintCanvas(canvas, tint) : canvas;
};

/**
 * Tinted sheets by source and tint. Tinting reads and rewrites every pixel, and most characters
 * share skins, hair and gear colours, so each combination is only tinted once. A sheet that fails
 * to load is left out of the drawing.
 */
const LAYER_CACHE = new Map<string, Promise<HTMLCanvasElement | null>>();
const loadLayer = ({ src, tint }: PlayerAsset) => {
  const key = `${src}|${tint ?? ""}`;
  let layer = LAYER_CACHE.get(key);
  if (!layer) {
    layer = loadCacheImage(src).then(
      (image) => drawImageOnNewCanvas(image, tint),
      () => null,
    );
    LAYER_CACHE.set(key, layer);
  }
  return layer;
};

/** Draws the character's layers, back to front, in one go so it never shows half-drawn. */
const drawLayers = (
  canvas: HTMLCanvasElement,
  assets: PlayerAsset[],
  layers: (HTMLCanvasElement | null)[],
) => {
  const atlas = weaponAtlas.offsets.human["down-stand"];
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, MIN_CANVAS_SIZE, MIN_CANVAS_SIZE);
  assets.forEach((asset, i) => {
    const layer = layers[i];
    if (!layer) return;
    const [x, y, w, h] = asset.previewRect;
    const isLeftWeapon = asset.slotKey === "handLeft";
    if (isLeftWeapon || asset.slotKey === "handRight") {
      const { x: tx, y: ty, flipX } = isLeftWeapon ? atlas.left : atlas.right;
      ctx.save();
      ctx.translate(MIN_CANVAS_SIZE / 2 + tx, MIN_CANVAS_SIZE / 2 + ty + 14);
      if (flipX) ctx.scale(-1, 1);
      ctx.drawImage(layer, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(layer, x, y, w, h, (MIN_CANVAS_SIZE - w) / 2, (MIN_CANVAS_SIZE - h) / 2, w, h);
    }
  });
};

type PlayerRenderProps = Omit<ComponentProps<typeof Box>, "ref"> & {
  player?: RenderablePlayer;
  filteredSlots?: string[];
  onLoadComplete?: (loaded: boolean) => void;
};

export const PlayerRender = memo(
  ({ player, sx, filteredSlots, onLoadComplete = () => {}, ...props }: PlayerRenderProps) => {
    const assets = getPlayerEquipmentAssets({ player, filteredSlots });
    const canvasRef = useRef<HTMLCanvasElement>(null);

    /* Redraw only when the layers change, not on every new player object. */
    const assetsKey = JSON.stringify(assets.map(({ src, tint, slotKey }) => [src, tint, slotKey]));
    const drawPlayer = useEffectEvent(async (isCurrent: () => boolean) => {
      /* Every sheet loads at once; drawing waits for them all. */
      const layers = await Promise.all(assets.map(loadLayer));
      if (!isCurrent() || !canvasRef.current) return;
      drawLayers(canvasRef.current, assets, layers);
      onLoadComplete(true);
    });

    useEffect(() => {
      /* A newer look, or unmounting, makes this draw stale. */
      let current = true;
      drawPlayer(() => current);
      return () => {
        current = false;
      };
    }, [assetsKey]);

    return (
      <Box
        sx={{ position: "relative", height: FULL_CANVAS_SIZE, width: FULL_CANVAS_SIZE, ...sx }}
        {...props}
      >
        <canvas
          ref={canvasRef}
          width={MIN_CANVAS_SIZE}
          height={MIN_CANVAS_SIZE}
          style={PLAYER_RENDER_CANVAS_STYLE}
        />
      </Box>
    );
  },
);

const getObscuredKeys = ({
  filteredSlots,
  visibleParts,
}: {
  filteredSlots: string[];
  visibleParts: Record<string, { texture?: string } | null | undefined>;
}) => {
  const helmetTexture = visibleParts?.helmet?.texture;
  const accessoryTexture = visibleParts?.accessory?.texture;
  if (HAIR_HIDING_HELMETS.includes(helmetTexture as string) && !filteredSlots?.includes("helmet")) {
    filteredSlots.push("hair");
  }
  if (ACCESSORY_HIDING_HELMETS.includes(helmetTexture as string)) {
    filteredSlots.push("accessory");
  }
  if (HAIR_HIDING_ACCESSORIES.includes(accessoryTexture as string)) {
    filteredSlots.push("hair");
  }
  if (FACE_HIDING_ACCESSORIES.includes(accessoryTexture as string)) {
    filteredSlots.push("face");
  }
  return filteredSlots;
};

const getPlayerEquipmentAssets = ({
  player,
  filteredSlots = [],
}: {
  player?: RenderablePlayer;
  filteredSlots?: Array<string>;
}) => {
  const keyOrder = [
    "skin",
    "chest",
    "hair",
    "pants",
    "boots",
    "gloves",
    "armor",
    "face",
    "whiskers",
    "accessory",
    "helmet",
    "handLeft",
    "handRight",
  ];

  const visibleParts: Record<string, LookPart | BuiltItem | null | undefined> = {
    hair: {
      slot: "hair",
      texture: player?.profile?.hair?.texture,
      tint: player?.profile?.hair?.tint,
    } as LookPart,
    face: {
      slot: "face",
      texture: player?.profile?.face?.texture,
      tint: player?.profile?.face?.tint,
    } as LookPart,
    whiskers: {
      slot: "whiskers",
      texture: player?.profile?.whiskers?.texture,
      tint: player?.profile?.whiskers?.tint,
    } as LookPart,
    skin: {
      slot: "skin",
      tint: player?.profile?.tint,
    } as LookPart,
    chest: {
      slot: "chest",
      tint: player?.profile?.tint,
    } as LookPart,
    ...filterVisibleEquipment(player ?? {}),
  };

  function resolvePreviewRect({ key }: { key: string }) {
    const isWeapon = ["handLeft", "handRight"]?.includes(key);
    const isSmallSprite = ["dog", "cat"]?.includes(player?.profile?.race as string);
    if (isWeapon) return [0, 0, MIN_CANVAS_SIZE, MIN_CANVAS_SIZE];
    if (isSmallSprite) return [0, 100, 50, 80];
    return [0, 160, 80, 80];
  }

  const playerAssets: Array<PlayerAsset> = keyOrder?.reduce<PlayerAsset[]>((acc, key) => {
    const item = visibleParts[key];
    if (item) {
      const assetRes = resolveAsset(item, player);
      const playerAsset: PlayerAsset = {
        slotKey: key,
        tint: item?.tint,
        slot: item?.slot,
        ...assetRes,
        previewRect: resolvePreviewRect({ key }),
      };
      acc.push(playerAsset);
    }
    return acc;
  }, []);

  const obscuredKeys = getObscuredKeys({ filteredSlots: [...filteredSlots], visibleParts });
  return playerAssets?.filter((asset) => !obscuredKeys.includes(asset?.slot as string));
};
