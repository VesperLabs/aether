import React, { useRef, useEffect, useState } from "react";
import { Box, useAppContext, Flex } from "./";
import { tintCanvas, imageToCanvas } from "../utils";
import { assetList } from "../Assets";

const PORTRAIT_SIZE = 50;

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
        transform: "translate(-51%, 5%) scale(2)",
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
  const { player } = useAppContext();
  const { race, gender } = player?.profile;
  const playerFace = player?.profile?.face;
  const playerHair = player?.profile?.hair;
  const playerAccessory = player?.equipment?.accessory;
  const playerArmor = player?.equipment?.armor;
  const playerHelmet = player?.equipment?.helmet;
  const skin = getAssetProps(race, player?.profile?.tint);
  const chest = getAssetProps(`${race}-${gender}-chest-bare`, player?.profile?.tint);
  const face = getAssetProps(`${race}-${playerFace?.texture}`, playerFace?.tint);
  const hair = getAssetProps(`${race}-${playerHair?.texture}`, playerHair?.tint);
  const accessory = getAssetProps(`${race}-${playerAccessory?.texture}`, playerAccessory?.tint);
  const armor = getAssetProps(`${race}-${gender}-${playerArmor?.texture}`, playerArmor?.tint);
  const helmet = getAssetProps(`${race}-${playerHelmet?.texture}`, playerHelmet?.tint);
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
          borderRadius: 50,
          width: PORTRAIT_SIZE,
          height: PORTRAIT_SIZE,
          bg: "black",
          position: "relative",
          overflow: "hidden",
          clipPath: "circle(25px at 25px 25px);",
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
  const { player } = useAppContext();
  return <Box sx={{ ...sx }}>{player?.profile?.userName}</Box>;
};

const Bar = ({ width = 100, height = 10, color = "red.300", min, max, sx }) => {
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
  const { player } = useAppContext();
  return (
    <Flex sx={{ gap: 1, m: 2 }}>
      <Portrait />
      <Flex sx={{ flexDirection: "column", gap: "1px" }}>
        <UserName />
        <Bar color="red.500" max={player?.stats?.maxHp} min={player?.stats?.hp} />
        <Bar color="blue.500" max={player?.stats?.maxMp} min={player?.stats?.mp} />
      </Flex>
    </Flex>
  );
};

export default MenuHud;
