import React, { useRef, useEffect } from "react";
import { Box, useAppContext } from "./";
import { tintCanvas, imageToCanvas } from "../utils";
import { assetList } from "../Assets";

const PORTRAIT_SIZE = 50;

function CanvasPreview({ assets }) {
  const canvasRef = useRef(null);

  useEffect(() => {
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
    };

    loadImages();
  }, []);

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

const getAssetProps = (name, tint) => {
  const asset = assetList?.find((a) => a?.texture === name);
  return { ...asset, tint };
};

const Portrait = () => {
  const { player } = useAppContext();
  if (!player?.profile) return;
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
        border: `1px solid #FFF`,
        boxShadow: `0px 0px 0px 1px #000`,
        borderRadius: "100%",
        width: PORTRAIT_SIZE,
        height: PORTRAIT_SIZE,
        bg: "black",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <CanvasPreview assets={assets} />
    </Box>
  );
};

const MenuHud = () => {
  return (
    <Box sx={{ position: "absolute", top: 10, left: 10 }}>
      <Portrait />
    </Box>
  );
};

export default MenuHud;
