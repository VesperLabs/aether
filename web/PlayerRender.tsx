import {
  ACCESSORY_HIDING_HELMETS,
  HAIR_HIDING_HELMETS,
  filterVisibleEquipment,
  resolveAsset,
  tintCanvas,
  CLASS_ICON_MAP,
} from "@aether/shared";
import { useEffect, useRef, useState } from "react";
import { Box, Flex, Icon, Text } from "@aether/ui";
import weaponAtlas from "../public/assets/atlas/weapon.json";
import { Tooltip } from "react-tooltip";
import { TOOLTIP_STYLE } from "./";

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

function CanvasPreview({ assets }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const atlas = weaponAtlas.offsets.human["down-stand"];
  const [loading, setLoading] = useState<Boolean>(true);
  const [canvasAlpha, setCanvasAlpha] = useState<number>(0);
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    let i = 0;
    const mergeImages = async () => {
      for (const asset of assets) {
        const img = await loadImage(asset.src);

        const isLeftWeapon = asset.slotKey === "handLeft";
        const isRightWeapon = asset.slotKey === "handRight";
        const isWeapon = isLeftWeapon || isRightWeapon;

        if (img) {
          const [x, y, w, h] = asset.previewRect;
          const canvasSize = 100;

          // Calculate the center position of the canvas
          const centerX = canvasSize / 2;
          const centerY = canvasSize / 2;

          // Calculate the destination position to draw the cropped image centered on the canvas
          const destX = centerX - w / 2;
          const destY = centerY - h / 2;

          // Save the current alpha value (opacity) of the canvas
          const prevAlpha = ctx.globalAlpha;

          // Set globalAlpha to 1.0 (fully opaque) to preserve the alpha channels of the drawn image
          ctx.globalAlpha = 1.0;

          // Apply transformations if it's a weapon
          if (isWeapon) {
            const transforms = isLeftWeapon ? atlas.left : atlas.right;
            const { x: tx, y: ty, flipX } = transforms;

            ctx.save(); // Save the current context state before applying transformations
            ctx.translate(destX + tx + w / 2, destY + ty + h / 2 + 14); // Translate to the center of the destination position
            if (flipX) ctx.scale(-1, 1); // Flip horizontally if required
            ctx.drawImage(drawImageOnNewCanvas(img, asset.tint), -w / 2, -h / 2, w, h); // Draw the image centered at (0, 0)
            ctx.restore(); // Restore the context state to remove applied transformations
          } else {
            // Draw the image on the canvas without transformations
            ctx.drawImage(drawImageOnNewCanvas(img, asset.tint), x, y, w, h, destX, destY, w, h);
          }

          // Restore the original alpha value
          ctx.globalAlpha = prevAlpha;
          i += 0.1;
          setCanvasAlpha(i);
        }
      }
      setLoading(false);
    };

    mergeImages();
  }, []);

  return (
    <Box sx={{ position: "relative", height: 160, width: 160 }}>
      <canvas
        ref={canvasRef}
        width={100}
        height={100}
        style={{
          zIndex: 0,
          transform: `translate(-50%, -50%) scale(2)`,
          imageRendering: "pixelated",
          position: "absolute",
          left: "50%",
          top: "50%",
          opacity: loading ? canvasAlpha : 1,
        }}
      />
    </Box>
  );
}

// Utility function to load an image and handle the onload event as a Promise
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

const getObscuredKeys = ({ filteredSlots, visibleParts }) => {
  const helmetTexture = visibleParts?.helmet?.texture;
  if (HAIR_HIDING_HELMETS.includes(helmetTexture) && !filteredSlots?.includes("helmet")) {
    filteredSlots.push("hair");
  }
  if (ACCESSORY_HIDING_HELMETS.includes(helmetTexture)) {
    filteredSlots.push("accessory");
  }
  return filteredSlots;
};

const getPlayerEquipmentAssets = (player: FullCharacterState) => {
  const filteredSlots = [];

  const keyOrder = [
    "skin",
    "chest",
    "hair",
    "pants",
    "boots",
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

  const playerAssets: Array<PlayerAsset> = keyOrder?.reduce((acc, key) => {
    const isWeapon = ["handLeft", "handRight"]?.includes(key);
    const item = visibleParts[key];
    if (item) {
      const assetRes = resolveAsset(item, player);
      const playerAsset: PlayerAsset = {
        slotKey: key,
        tint: item?.tint,
        slot: item?.slot,
        ...assetRes,
        previewRect: isWeapon ? [0, 0, 100, 100] : [0, 160, 80, 80],
      };
      acc.push(playerAsset);
    }
    return acc;
  }, []);

  const obscuredKeys = getObscuredKeys({ filteredSlots, visibleParts });
  return playerAssets?.filter((asset) => !obscuredKeys.includes(asset?.slot));
};

export default function PlayerRender({ player }) {
  const assets = getPlayerEquipmentAssets(player);

  return (
    <Flex
      sx={{ flexDirection: "column", alignItems: "center", mx: -2 }}
      data-tooltip-id={player?.id}
      data-tooltip-place="bottom"
    >
      <CanvasPreview assets={assets} />
      <Flex sx={{ mt: -4, gap: 1, alignItems: "center" }}>
        <Icon
          size={22}
          icon={CLASS_ICON_MAP?.[player?.charClass?.toUpperCase()]}
          sx={{ transform: "scale(.75)", imageRendering: "smooth" }}
        />
        <Text>{player?.profile?.userName}</Text>
        <Text sx={{ opacity: 0.5 }}>(Lv. {player?.stats?.level})</Text>
      </Flex>
      <PlayerTooltip player={player} />
    </Flex>
  );
}

const PlayerTooltip = ({ player }) => {
  return (
    <Tooltip id={player?.id}>
      <Flex sx={TOOLTIP_STYLE}>Last Login {player?.updatedAt}</Flex>
    </Tooltip>
  );
};
