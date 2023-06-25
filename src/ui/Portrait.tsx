import { useRef, useEffect, useState } from "react";
import { Box, useAppContext } from "./";
import { tintCanvas, imageToCanvas, HAIR_HIDING_HELMETS } from "../utils";
import { assetList } from "../../shared/Assets";

function CanvasPreview({ assets, topOffset = 10, scale = 2, atlasSize = 80 }) {
  const canvasRef = useRef(null);
  const [imageUrls, setImageUrls] = useState([]);
  const { game } = useAppContext();
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = atlasSize;
    canvas.height = atlasSize;
    const urls = [];
    for (const asset of assets) {
      if (!asset?.name) continue;
      const img = game?.textures?.get?.(asset?.name)?.getSourceImage();
      if (!img?.width) continue;
      const [x, y, w, h] = [0, atlasSize * 2, atlasSize, atlasSize];
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
  user: FullCharacterState;
  size?: integer;
  topOffset?: integer;
  scale?: number;
  filterKeys?: string[];
}) => {
  if (!user?.equipment) return;
  const getAssetProps = useGetAssetProps();
  const { race, gender } = user?.profile ?? {};
  const userFace = user?.profile?.face;
  const userHair = user?.profile?.hair;
  const userWhiskers = user?.profile?.whiskers;

  // filter out equipment slotNames that are not in activeItemsSlots array
  const filteredEquipment = Object.fromEntries(
    Object.entries(user?.equipment).filter(([key]) => user.activeItemSlots.includes(key))
  );
  const userAccessory = filteredEquipment?.accessory;
  const userArmor = filteredEquipment?.armor;
  const userBoots = filteredEquipment?.boots;
  const userPants = filteredEquipment?.pants;
  const userHelmet = filteredEquipment?.helmet;
  const skin = getAssetProps("skin", race, user?.profile?.tint);
  const chest = getAssetProps("chest", `${race}-${gender}-chest-bare`, user?.profile?.tint);
  const face = getAssetProps("face", `${race}-${userFace?.texture}`, userFace?.tint);
  const whiskers = getAssetProps(
    "whiskers",
    `${race}-${userWhiskers?.texture}`,
    userWhiskers?.tint
  );
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

  const obscuredKeys =
    HAIR_HIDING_HELMETS.includes(userHelmet?.texture) && !filterKeys?.includes("helmet")
      ? ["hair"]
      : filterKeys;

  const assets = [skin, chest, hair, boots, pants, armor, face, whiskers, accessory, helmet]
    ?.filter(Boolean)
    ?.filter((asset) => !obscuredKeys.includes(asset.slotKey));

  const atlasSize = assetList?.find((a) => a?.texture === race)?.previewRect?.[3];

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
        <CanvasPreview
          assets={assets}
          topOffset={race === "human" ? topOffset : -12}
          scale={scale}
          atlasSize={atlasSize}
        />
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
