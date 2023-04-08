import { useRef, useEffect, useState } from "react";
import { Box, useAppContext } from "./";
import { tintCanvas, imageToCanvas } from "../utils";

function CanvasPreview({ assets, topOffset = 10, scale = 2 }) {
  const canvasRef = useRef(null);
  const [imageUrls, setImageUrls] = useState([]);
  const { game } = useAppContext();
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = 80;
    canvas.height = 80;
    const urls = [];
    for (const asset of assets) {
      if (!asset?.name) continue;
      const img = game?.textures?.get?.(asset?.name)?.getSourceImage();
      if (!img?.width) continue;
      const [x, y, w, h] = [0, 160, 80, 80];
      const tintedCanvas = tintCanvas(imageToCanvas(img), asset?.tint);
      ctx.drawImage(tintedCanvas, x, y, w, h, 0, 0, w, h);
      const url = canvas.toDataURL();
      urls.push(url);
    }
    setImageUrls(urls);
  }, [JSON.stringify(assets)]);

  return (
    <>
      {imageUrls.map((url, idx) => (
        <img
          key={idx}
          src={url}
          style={{
            transform: `translate(-50%, ${topOffset}%) scale(${scale})`,
            imageRendering: "pixelated",
            position: "absolute",
            left: "50%",
            top: 0,
          }}
        />
      ))}
      <canvas
        style={{
          display: "none",
        }}
        ref={canvasRef}
      />
    </>
  );
}

const Portrait = ({
  user,
  size = 54,
  topOffset,
  scale = 2,
  filterKeys = [],
}: {
  user: CharacterState;
  size?: integer;
  topOffset?: integer;
  scale?: number;
  filterKeys?: string[];
}) => {
  const getAssetProps = useGetAssetProps();
  const { race, gender } = user?.profile ?? {};
  const userFace = user?.profile?.face;
  const userHair = user?.profile?.hair;
  const userAccessory = user?.equipment?.accessory;
  const userArmor = user?.equipment?.armor;
  const userBoots = user?.equipment?.boots;
  const userPants = user?.equipment?.pants;
  const userHelmet = user?.equipment?.helmet;
  const skin = getAssetProps("skin", race, user?.profile?.tint);
  const chest = getAssetProps("chest", `${race}-${gender}-chest-bare`, user?.profile?.tint);
  const face = getAssetProps("face", `${race}-${userFace?.texture}`, userFace?.tint);
  const hair = getAssetProps("hair", `${race}-${userHair?.texture}`, userHair?.tint);
  const accessory = getAssetProps(
    "accessory",
    `${race}-${userAccessory?.texture}`,
    userAccessory?.tint
  );
  const armor = getAssetProps("armor", `${race}-${gender}-${userArmor?.texture}`, userArmor?.tint);
  const pants = getAssetProps("pants", `${race}-${userPants?.texture}`, userPants?.tint);
  const boots = getAssetProps("boots", `${race}-${userBoots?.texture}`, userBoots?.tint);
  const helmet = getAssetProps("helmet", `${race}-${userHelmet?.texture}`, userHelmet?.tint);
  const assets = [skin, chest, hair, boots, pants, armor, face, helmet, accessory]
    ?.filter(Boolean)
    ?.filter((asset) => !filterKeys.includes(asset.slotKey));
  return (
    <Box
      sx={{
        border: `1px solid #000`,
        borderRadius: size,
        width: size + 2,
        height: size + 2,
      }}
    >
      <Box
        sx={{
          border: `1px solid #FFF`,
          borderRadius: size,
          width: size,
          height: size,
          bg: "shadow.30",
          position: "relative",
          overflow: "hidden",
          clipPath: `circle(${size / 2}px at ${size / 2}px ${size / 2}px)`,
        }}
      >
        <CanvasPreview assets={assets} topOffset={topOffset} scale={scale} />
      </Box>
    </Box>
  );
};

const useGetAssetProps = () => {
  return (slotKey: string, name: string, tint: string) => {
    return { slotKey, name, tint };
  };
};

export default Portrait;
