import { useRef, useEffect, useCallback } from "react";
import { Box, useAppContext } from "./";
import { tintCanvas, imageToCanvas } from "../utils";

const PORTRAIT_SIZE = 54;

function CanvasPreview({ assets }) {
  const canvasRef = useRef(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = 80;
    canvas.height = 80;
    for (const asset of assets) {
      const [x, y, w, h] = [0, 160, 80, 80];
      const tintedCanvas = tintCanvas(imageToCanvas(asset.img), asset?.tint);
      ctx.drawImage(tintedCanvas, x, y, w, h, 0, 0, w, h);
    }
  }, [assets]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

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

const Portrait = ({ user }) => {
  const getAssetProps = useGetAssetProps();
  const { race, gender } = user?.profile ?? {};
  const userFace = user?.profile?.face;
  const userHair = user?.profile?.hair;
  const userAccessory = user?.equipment?.accessory;
  const userArmor = user?.equipment?.armor;
  const userHelmet = user?.equipment?.helmet;
  const skin = getAssetProps(race, user?.profile?.tint);
  const chest = getAssetProps(`${race}-${gender}-chest-bare`, user?.profile?.tint);
  const face = getAssetProps(`${race}-${userFace?.texture}`, userFace?.tint);
  const hair = getAssetProps(`${race}-${userHair?.texture}`, userHair?.tint);
  const accessory = getAssetProps(`${race}-${userAccessory?.texture}`, userAccessory?.tint);
  const armor = getAssetProps(`${race}-${gender}-${userArmor?.texture}`, userArmor?.tint);
  const helmet = getAssetProps(`${race}-${userHelmet?.texture}`, userHelmet?.tint);
  const assets = [skin, chest, hair, face, armor, helmet, accessory]?.filter(Boolean);
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

const useGetAssetProps = () => {
  const { game } = useAppContext();

  return (name, tint) => {
    return { img: game.textures.get(name).getSourceImage(), tint };
  };
};

export default Portrait;
