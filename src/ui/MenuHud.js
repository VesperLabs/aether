import React, { useRef, useEffect } from "react";
import { Box, useAppContext } from "./";
import { resolveAsset, getAssetByTextureName } from "../Assets";

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
        const [x, y, w, h] = asset.previewRect;

        img.src = asset.src;
        await img.decode();
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      }
    };

    loadImages();
  }, []);

  return (
    <Box
      as="canvas"
      sx={{
        transform: "translate(-50%, 0) scale(2)",
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
  if (!player?.profile) return;
  const { race, gender } = player?.profile;
  const faceTexture = player?.profile?.face?.texture;
  const hairTexture = player?.profile?.hair?.texture;
  const skin = getAssetByTextureName(race);
  const chest = getAssetByTextureName(`${race}-${gender}-chest-bare`);
  const face = getAssetByTextureName(`${race}-${faceTexture}`);
  const hair = getAssetByTextureName(`${race}-${hairTexture}`);
  return (
    <Box
      sx={{
        borderRadius: "100%",
        width: PORTRAIT_SIZE,
        height: PORTRAIT_SIZE,
        bg: "black",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <CanvasPreview assets={[skin, chest, face, hair]} />
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
