import {
  ACCESSORY_HIDING_HELMETS,
  HAIR_HIDING_HELMETS,
  filterVisibleEquipment,
  resolveAsset,
  tintCanvas,
  loadCacheImage,
  HAIR_HIDING_ACCESSORIES,
  FACE_HIDING_ACCESSORIES,
} from "@aether/shared";
import { memo, useEffect, useRef } from "react";
import { Box } from "@aether/ui";
import weaponAtlas from "../public/assets/atlas/weapon.json";

export const FULL_CANVAS_SIZE = 160;
const MIN_CANVAS_SIZE = 100;

export const PLAYER_RENDER_CANVAS_STYLE: any = {
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
  previewRect: any;
  slot: string;
  atlas: string;
  slotKey?: string;
};

const drawImageOnNewCanvas = (image, tint) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = image.width;
  canvas.height = image.height;

  // Draw the image on the canvas
  ctx.drawImage(image, 0, 0);

  // Apply tint if needed
  if (tint) {
    return tintCanvas(canvas, tint);
  }

  return canvas;
};

const mergeImages = async ({ shouldBuffer, buffCanvasRef, canvasRef, assets }) => {
  if (!buffCanvasRef.current || !canvasRef?.current) return;
  const atlas = weaponAtlas.offsets.human["down-stand"];
  const buffCanvas = shouldBuffer ? buffCanvasRef.current : canvasRef?.current;
  const btx = buffCanvas.getContext("2d");
  btx.imageSmoothingEnabled = false;
  // Clear the buffer canvas before drawing
  btx.clearRect(0, 0, MIN_CANVAS_SIZE, MIN_CANVAS_SIZE);
  for (const asset of assets) {
    const img = await loadCacheImage(asset.src);
    const isLeftWeapon = asset.slotKey === "handLeft";
    const isRightWeapon = asset.slotKey === "handRight";
    const isWeapon = isLeftWeapon || isRightWeapon;

    if (img) {
      const [x, y, w, h] = asset.previewRect;

      // Apply transformations if it's a weapon
      if (isWeapon) {
        const transforms = isLeftWeapon ? atlas.left : atlas.right;
        const { x: tx, y: ty, flipX } = transforms;
        btx.save(); // Save the current context state before applying transformations
        btx.translate(MIN_CANVAS_SIZE / 2 + tx, MIN_CANVAS_SIZE / 2 + ty + 14); // Translate to the center of the buffer canvas
        if (flipX) btx.scale(-1, 1); // Flip horizontally if required
        btx.drawImage(drawImageOnNewCanvas(img, asset.tint), -w / 2, -h / 2, w, h); // Draw the image centered at (0, 0)
        btx.restore(); // Restore the context state to remove applied transformations
      } else {
        // Draw the image on the buffer canvas without transformations
        btx.drawImage(
          drawImageOnNewCanvas(img, asset.tint),
          x,
          y,
          w,
          h,
          (MIN_CANVAS_SIZE - w) / 2,
          (MIN_CANVAS_SIZE - h) / 2,
          w,
          h
        );
      }
    }
  }
  if (canvasRef.current && shouldBuffer) {
    const mainCanvas = canvasRef.current;
    const mainCtx = mainCanvas.getContext("2d");
    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    mainCtx.drawImage(
      buffCanvas,
      0,
      0,
      MIN_CANVAS_SIZE,
      MIN_CANVAS_SIZE,
      0,
      0,
      mainCanvas.width,
      mainCanvas.height
    );
  }
};

const PlayerRender = memo(
  ({
    player,
    sx,
    shouldBuffer = true,
    filteredSlots,
    onLoadComplete = () => {},
    ...props
  }: any) => {
    const assets = getPlayerEquipmentAssets({ player, filteredSlots });
    const buffCanvasRef = useRef<HTMLCanvasElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      const mergeImagesAsync = async () => {
        await mergeImages({ shouldBuffer, buffCanvasRef, canvasRef, assets });
        onLoadComplete(true);
      };
      mergeImagesAsync(); // Call the async function here
    }, [JSON.stringify(player?.equipment), JSON.stringify(player?.profile)]);

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
        <canvas
          ref={buffCanvasRef}
          width={MIN_CANVAS_SIZE}
          height={MIN_CANVAS_SIZE}
          style={{
            display: "none",
          }}
        />
      </Box>
    );
  },
  (prev, next) => {
    return (
      prev?.player?.profile === next?.player?.profile &&
      prev?.player?.activeItemSlots === next?.player?.activeItemSlots &&
      prev?.player?.equipment === prev?.player?.equipment
    );
  }
);

const getObscuredKeys = ({ filteredSlots, visibleParts }) => {
  const helmetTexture = visibleParts?.helmet?.texture;
  const accessoryTexture = visibleParts?.accessory?.texture;
  if (HAIR_HIDING_HELMETS.includes(helmetTexture) && !filteredSlots?.includes("helmet")) {
    filteredSlots.push("hair");
  }
  if (ACCESSORY_HIDING_HELMETS.includes(helmetTexture)) {
    filteredSlots.push("accessory");
  }
  if (HAIR_HIDING_ACCESSORIES.includes(accessoryTexture)) {
    filteredSlots.push("hair");
  }
  if (FACE_HIDING_ACCESSORIES.includes(accessoryTexture)) {
    filteredSlots.push("face");
  }
  return filteredSlots;
};

const getPlayerEquipmentAssets = ({
  player,
  filteredSlots = [],
}: {
  player: FullCharacterState;
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

  const visibleParts = {
    hair: {
      slot: "hair",
      texture: player?.profile?.hair?.texture,
      tint: player?.profile?.hair?.tint,
    } as Item,
    face: {
      slot: "face",
      texture: player?.profile?.face?.texture,
      tint: player?.profile?.face?.tint,
    } as Item,
    whiskers: {
      slot: "whiskers",
      texture: player?.profile?.whiskers?.texture,
      tint: player?.profile?.whiskers?.tint,
    } as Item,
    skin: {
      slot: "skin",
      tint: player?.profile?.tint,
    } as Item,
    chest: {
      slot: "chest",
      tint: player?.profile?.tint,
    } as Item,
    ...filterVisibleEquipment(player),
  };

  function resolvePreviewRect({ key }) {
    const isWeapon = ["handLeft", "handRight"]?.includes(key);
    const isSmallSprite = ["dog", "cat"]?.includes(player?.profile?.race);
    if (isWeapon) return [0, 0, MIN_CANVAS_SIZE, MIN_CANVAS_SIZE];
    if (isSmallSprite) return [0, 100, 50, 80];
    return [0, 160, 80, 80];
  }

  const playerAssets: Array<PlayerAsset> = keyOrder?.reduce((acc, key) => {
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

  const obscuredKeys = getObscuredKeys({ filteredSlots, visibleParts });
  return playerAssets?.filter((asset) => !obscuredKeys.includes(asset?.slot));
};

export default PlayerRender;
