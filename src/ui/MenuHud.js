import React, { useRef, useEffect, useState } from "react";
import { Box, useAppContext, Flex } from "./";
import { tintCanvas, imageToCanvas } from "../utils";
import { assetList } from "../../shared/Assets";

const PORTRAIT_SIZE = 54;

function CanvasPreview({ assets }) {
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = 80;
    canvas.height = 80;
    const loadImages = async () => {
      for (const asset of assets) {
        const img = new Image();
        const [x, y, w, h] = [0, 160, 80, 80];
        img.src = asset.src;
        await img.decode();
        const tintedCanvas = tintCanvas(imageToCanvas(img), asset?.tint);
        ctx.drawImage(tintedCanvas, x, y, w, h, 0, 0, w, h);
      }
      setLoading(false);
    };

    loadImages();
  }, [JSON.stringify(assets)]);

  return (
    <Box
      as="canvas"
      sx={{
        transform: "translate(-50%, 10%) scale(2)",
        imageRendering: "pixelated",
        position: "absolute",
        left: "50%",
        top: 0,
      }}
      ref={canvasRef}
    />
  );
}

const Portrait = () => {
  const { hero } = useAppContext();
  const { race, gender } = hero?.profile;
  const heroFace = hero?.profile?.face;
  const heroHair = hero?.profile?.hair;
  const heroAccessory = hero?.equipment?.accessory;
  const heroArmor = hero?.equipment?.armor;
  const heroHelmet = hero?.equipment?.helmet;
  const skin = getAssetProps(race, hero?.profile?.tint);
  const chest = getAssetProps(`${race}-${gender}-chest-bare`, hero?.profile?.tint);
  const face = getAssetProps(`${race}-${heroFace?.texture}`, heroFace?.tint);
  const hair = getAssetProps(`${race}-${heroHair?.texture}`, heroHair?.tint);
  const accessory = getAssetProps(`${race}-${heroAccessory?.texture}`, heroAccessory?.tint);
  const armor = getAssetProps(`${race}-${gender}-${heroArmor?.texture}`, heroArmor?.tint);
  const helmet = getAssetProps(`${race}-${heroHelmet?.texture}`, heroHelmet?.tint);
  const assets = [skin, chest, face, hair, armor, helmet, accessory]?.filter(Boolean);
  return (
    <Box
      sx={{
        border: `1px solid #000`,
        borderRadius: 52,
        width: PORTRAIT_SIZE + 2,
        height: PORTRAIT_SIZE + 2,
      }}
    >
      <Box
        sx={{
          border: `1px solid #FFF`,
          borderRadius: PORTRAIT_SIZE,
          width: PORTRAIT_SIZE,
          height: PORTRAIT_SIZE,
          bg: "black",
          position: "relative",
          overflow: "hidden",
          clipPath: `circle(${PORTRAIT_SIZE / 2}px at ${PORTRAIT_SIZE / 2}px ${
            PORTRAIT_SIZE / 2
          }px)`,
        }}
      >
        <CanvasPreview assets={assets} />
      </Box>
    </Box>
  );
};

const getAssetProps = (name, tint) => {
  const asset = assetList?.find((a) => a?.texture === name);
  return asset ? { ...asset, tint } : null;
};

const UserName = ({ sx }) => {
  const { hero } = useAppContext();
  return <Box sx={{ ...sx }}>{hero?.profile?.userName}</Box>;
};

const Bar = ({ width = 100, height = 10, color = "red", min, max, sx }) => {
  const percent = Math.round((min / max) * 100) + "%";
  return (
    <Box
      sx={{
        overflow: "hidden",
        borderRadius: 3,
        bg: "shadow.25",
        border: (t) => `1px solid rgba(255,255,255,.85)`,
        boxShadow: `0px 0px 0px 1px #000`,
        width,
        height,
        ...sx,
      }}
    >
      <Box sx={{ bg: color, height: "100%", width: percent }} />
    </Box>
  );
};

const MenuHud = () => {
  const { hero } = useAppContext();
  return (
    <Flex sx={{ gap: 1, top: 2, left: 2, position: "absolute" }}>
      <Portrait />
      <Flex sx={{ flexDirection: "column", gap: "1px" }}>
        <UserName />
        <Bar color="red.700" max={hero?.stats?.maxHp} min={hero?.stats?.hp} />
        <Bar color="blue.500" max={hero?.stats?.maxMp} min={hero?.stats?.mp} />
      </Flex>
    </Flex>
  );
};

export default MenuHud;
