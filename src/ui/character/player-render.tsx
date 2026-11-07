import { assetList, getLayerOrder, resolveAsset, type BuiltItem, type MobProfile } from "@/content";
import {
  ACCESSORY_HIDING_HELMETS,
  HAIR_HIDING_HELMETS,
  HAIR_HIDING_ACCESSORIES,
  FACE_HIDING_ACCESSORIES,
} from "@/content";
import { filterVisibleEquipment } from "@/rules/character";
import { memo, useEffect, useEffectEvent, useRef, type ComponentProps } from "react";
import type { CSSProperties } from "react";
import { Box } from "@/ui/kit";
import weaponAtlas from "../../../public/assets/atlas/weapon.json";
import { loadSheet } from "./sprite-sheet";
import { getWalkFrameName, getWalkFrameRect, useWalkCycle, type WalkPose } from "./walk-cycle";

const FULL_CANVAS_SIZE = 160;
export const MIN_CANVAS_SIZE = 100;

const PLAYER_RENDER_CANVAS_STYLE: CSSProperties = {
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
  atlasFile?: string;
  isShield?: boolean;
};

type WeaponPose = { x: number; y: number; flipX?: boolean; flipY?: boolean; rotation?: number };
type WeaponOffsets = { left: WeaponPose; right: WeaponPose };

/** The parts of a character the renderer reads: how it looks and what it wears. */
export interface RenderablePlayer {
  profile?: MobProfile;
  equipment?: Record<string, BuiltItem | null | undefined>;
  activeItemSlots?: string[];
}

/** A look layer (hair, face...) built from the profile; it has no item behind it. */
type LookPart = { slot: string; texture?: string; tint?: string };

/** Draws the character's layers, back to front, in one go so it never shows half-drawn. */
export const drawLayers = (
  canvas: HTMLCanvasElement,
  assets: PlayerAsset[],
  layers: (HTMLCanvasElement | null)[],
  pose?: WalkPose,
) => {
  const frame = pose ? getWalkFrameName(pose) : "down-stand";
  const atlas = (weaponAtlas.offsets.human as Record<string, WeaponOffsets>)[frame];
  const isLeftShield = assets.some((asset) => asset.slotKey === "handLeft" && asset.isShield);
  const order = pose ? getLayerOrder(pose.direction, isLeftShield) : undefined;
  /* A layer listed twice is drawn at its last place, the same way Phaser's bringToTop stacks it. */
  const drawOrder = assets
    .map((asset, i) => ({ asset, layer: layers[i] }))
    .sort((a, b) =>
      order
        ? order.lastIndexOf(a.asset.slotKey as never) - order.lastIndexOf(b.asset.slotKey as never)
        : 0,
    );
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, MIN_CANVAS_SIZE, MIN_CANVAS_SIZE);
  drawOrder.forEach(({ asset, layer }) => {
    if (!layer) return;
    const [x, y, w, h] = (pose && getWalkFrameRect(asset.atlasFile, pose)) || asset.previewRect;
    const isLeftWeapon = asset.slotKey === "handLeft";
    if (isLeftWeapon || asset.slotKey === "handRight") {
      const { x: tx, y: ty, flipX, flipY, rotation = 0 } = isLeftWeapon ? atlas.left : atlas.right;
      ctx.save();
      ctx.translate(MIN_CANVAS_SIZE / 2 + tx, MIN_CANVAS_SIZE / 2 + ty + 14);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
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
  /** Walks in place, turning as it goes, instead of standing facing the viewer. */
  walking?: boolean;
  /** Draws the shadow the character casts in the game. */
  shadow?: boolean;
};

export const PlayerRender = memo(
  ({
    player,
    sx,
    filteredSlots,
    onLoadComplete = () => {},
    walking = false,
    shadow = false,
    ...props
  }: PlayerRenderProps) => {
    const assets = getPlayerEquipmentAssets({ player, filteredSlots, shadow });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pose = useWalkCycle(walking);

    /* Redraw only when the layers change, not on every new player object. */
    const assetsKey = JSON.stringify(assets.map(({ src, tint, slotKey }) => [src, tint, slotKey]));
    const drawPlayer = useEffectEvent(async (isCurrent: () => boolean) => {
      /* Every sheet loads at once; drawing waits for them all. */
      const layers = await Promise.all(assets.map(loadSheet));
      if (!isCurrent() || !canvasRef.current) return;
      drawLayers(canvasRef.current, assets, layers, pose);
      onLoadComplete(true);
    });

    useEffect(() => {
      /* A newer look, or unmounting, makes this draw stale. */
      let current = true;
      drawPlayer(() => current);
      return () => {
        current = false;
      };
    }, [assetsKey, pose]);

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

export const getPlayerEquipmentAssets = ({
  player,
  filteredSlots = [],
  shadow = false,
}: {
  player?: RenderablePlayer;
  filteredSlots?: Array<string>;
  shadow?: boolean;
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
        isShield: (item as BuiltItem)?.type === "shield",
        ...assetRes,
        atlasFile: assetRes.atlas,
        previewRect: resolvePreviewRect({ key }),
      };
      acc.push(playerAsset);
    }
    return acc;
  }, []);

  const obscuredKeys = getObscuredKeys({ filteredSlots: [...filteredSlots], visibleParts });
  const visibleAssets = playerAssets?.filter(
    (asset) => !obscuredKeys.includes(asset?.slot as string),
  );
  const shadowAsset = assetList.find(({ texture }) => texture === "shadow");
  if (!shadow || !shadowAsset) return visibleAssets;
  return [
    {
      ...shadowAsset,
      slotKey: "shadow",
      atlasFile: shadowAsset.atlas,
      previewRect: [...shadowAsset.previewRect],
    },
    ...visibleAssets,
  ];
};
