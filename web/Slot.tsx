import { useLayoutEffect, useState, Fragment } from "react";
import {
  resolveAsset,
  trimCanvas,
  tintCanvas,
  formatStats,
  buffList,
  ItemBuilder,
  itemSetList,
} from "@aether/shared";
import { Box, Icon, STYLE_NON_EMPTY, SLOT_SIZE, Tooltip, Text, Flex, Divider } from "@aether/ui";

export default function ({ item }) {
  const [imageData, setImageData] = useState<any>();
  /* Loads the item canvas data out of the texture */
  useLayoutEffect(() => {
    if (!item) return;
    const asset = resolveAsset(item, { profile: { race: "human", gender: "female" } });
    if (!asset) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const img = new Image();

    img.onload = () => {
      const [x, y, w, h] = asset.previewRect;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      const trimmedCanvas = trimCanvas(canvas);
      const tintedCanvas = tintCanvas(trimmedCanvas, item?.tint);
      setImageData(tintedCanvas.toDataURL("image/png"));
    };

    img.src = asset.src;
  }, [item]);

  return (
    <Box
      sx={{
        ...STYLE_NON_EMPTY({ rarity: item?.rarity }),
        width: SLOT_SIZE,
        height: SLOT_SIZE,
        "&:hover > .icon": {
          transition: ".2s ease all",
          transform: "scale(2)",
        },
        cursor: "pointer",
      }}
      data-tooltip-id={item?.key}
    >
      <ItemTooltip item={item} />
      <Icon
        className="icon"
        icon={imageData}
        size={SLOT_SIZE}
        sx={{
          pointerEvents: "none",
          imageRendering: "pixelated",
        }}
      />
    </Box>
  );
}

const Label = (props) => <Text sx={{ fontWeight: "normal" }} {...props} />;

const TextDivider = ({ children, sx }: any) => (
  <>
    <Divider sx={{ pt: 2, zIndex: -1 }} />
    <Text sx={{ mt: -3, pb: 2, mb: -1, color: "gray.500", ...sx }}>{children}</Text>
  </>
);

const ItemTooltip = ({ item }) => {
  const stats = formatStats(item?.stats || {});
  const effects = formatStats(item?.effects || {});
  const percentStats = formatStats(item?.percentStats || {});
  const requirements = formatStats(item?.requirements || {});
  const buffs = item?.buffs || {};

  const setBonus = ItemBuilder.getSetInfo(item?.setName);
  const numSetPieces = itemSetList?.[item?.setName]?.pieces;

  const setStats = formatStats(setBonus?.stats || {});

  return (
    <Tooltip id={item?.key}>
      <Flex
        sx={{
          fontWeight: "bold",
          whiteSpace: "nowrap",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          textTransform: "capitalize",
        }}
      >
        <Text>
          {item?.name}
          <Text color="gray.400" sx={{ ml: "2px" }}>
            {item?.amount > 1 && `(${item?.amount})`}
          </Text>
          {item?.slot == "spell" && <span> (Lv. {item?.ilvl})</span>}
        </Text>
        <Text color={item?.rarity}>
          {item?.rarity} {item?.type === "spell" ? "spell" : item?.base?.replaceAll("-", " ")}
        </Text>
        {Object.keys(stats)?.length > 0 && <TextDivider>Stats</TextDivider>}
        {Object.keys(stats).map((key) => (
          <Text key={key}>
            <Label>{key}:</Label>{" "}
            {Array.isArray(stats[key]) ? `${stats[key][0]} - ${stats[key][1]}` : stats[key]}
          </Text>
        ))}
        {Object.keys(percentStats).map((key) => (
          <Text key={key}>
            <Label>{key}:</Label>{" "}
            {Array.isArray(percentStats[key])
              ? `${percentStats[key][0]}% - ${percentStats[key][1]}%`
              : percentStats[key] + "%"}
          </Text>
        ))}
        {Object.keys(effects)?.length > 0 && <TextDivider>Effects</TextDivider>}
        {Object.keys(effects).map((key) => {
          return (
            <Text key={key}>
              <Label>{key}:</Label> {effects[key]}
            </Text>
          );
        })}
        {Object.keys(buffs).map((buffName) => {
          const buffStats = formatStats({
            duration: buffList?.[buffName]?.duration,
            ...buffList?.[buffName]?.stats,
          });
          return (
            <Fragment key={buffName}>
              <TextDivider>{buffName} Buff</TextDivider>
              {Object.keys(buffStats).map((stat) => {
                return (
                  <Text key={stat}>
                    <Label>{stat}:</Label> {buffStats?.[stat]}
                  </Text>
                );
              })}
            </Fragment>
          );
        })}
        {Object.keys(requirements)?.length > 0 && <TextDivider>Requirements</TextDivider>}
        {Object.keys(requirements).map((key) => {
          return (
            <Text key={key}>
              <Label>{key}:</Label> {requirements[key]}
            </Text>
          );
        })}
        {setBonus && (
          <>
            <TextDivider>
              Set Bonus <Text color="set">({numSetPieces} piece)</Text>
            </TextDivider>
            {Object.keys(setBonus?.percentStats || {}).map((key) => {
              return (
                <Text key={key} color="set">
                  <Label>{key}:</Label> {setBonus.percentStats[key]}%
                </Text>
              );
            })}
            {Object.keys(setStats).map((key) => (
              <Text key={key} color="set">
                <Label>{key}:</Label> {setStats[key]}
              </Text>
            ))}
          </>
        )}
        {item?.space && (
          <>
            <TextDivider>Space</TextDivider>
            {`${item?.items?.filter((i: Item) => i)?.length || 0} / ${item?.space}`}
          </>
        )}
        <Divider />
        <Flex sx={{ alignItems: "center", gap: 2 }}>
          <Flex sx={{ alignItems: "center", gap: "2px" }}>
            <Icon icon="../assets/icons/gold.png" size={16} />
            {item?.cost * (item?.amount || 1)}
          </Flex>
          {item?.stats?.mpCost && (
            <Flex sx={{ alignItems: "center", gap: "2px" }}>
              <Icon icon="../assets/icons/mana.png" size={16} />
              {"-" + item?.stats?.mpCost}
            </Flex>
          )}
          {item?.stats?.spCost && (
            <Flex sx={{ alignItems: "center", gap: "2px" }}>
              <Icon icon="../assets/icons/stamina.png" size={16} />
              {"-" + item?.stats?.spCost}
            </Flex>
          )}
        </Flex>
      </Flex>
    </Tooltip>
  );
};
