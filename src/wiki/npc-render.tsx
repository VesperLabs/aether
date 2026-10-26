import { useLayoutEffect, useState } from "react";
import { assetList } from "@/shared/content";
import { assetToCanvas } from "@/shared";
import { Box, Icon, STYLE_NON_EMPTY, Tooltip, Text, Flex } from "@/ui";
import { TOOLTIP_STYLE } from ".";

const SLOT_SIZE = 100;

export function NpcRender({ model }) {
  const [imageData, setImageData] = useState<any>();
  /* Loads the model canvas data out of the textures */
  useLayoutEffect(() => {
    if (!model) return;
    const asset = assetList?.find((a) => a?.texture === model?.profile?.race);
    if (!asset) return;
    assetToCanvas({ asset, tint: model?.profile?.tint, setImageData });
  }, [model]);

  return (
    <Box
      sx={{
        ...STYLE_NON_EMPTY({ rarity: "common" }),
        width: SLOT_SIZE,
        height: SLOT_SIZE,
        "&:hover > .icon": {
          transition: ".1s ease all",
          transform: "scale(2)",
          zIndex: 200,
        },
        position: "relative",
        cursor: "pointer",
      }}
      data-tooltip-id={model?.key}
      data-tooltip-place="bottom"
    >
      <Icon
        className="icon"
        icon={imageData}
        size={SLOT_SIZE}
        sx={{
          pointerEvents: "none",
          imageRendering: "pixelated",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          zoom: model?.profile?.scale,
          transformOrigin: "100% 100%",
          position: "absolute",
        }}
      />
      <ModelTooltip model={model} />
    </Box>
  );
}

const ModelTooltip = ({ model }) => {
  return (
    <Tooltip id={model?.key}>
      <Flex sx={TOOLTIP_STYLE}>
        <Text>{model?.profile?.userName}</Text>
      </Flex>
    </Tooltip>
  );
};
