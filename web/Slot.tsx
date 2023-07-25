import { useLayoutEffect, useState, Fragment } from "react";
import {
  resolveAsset,
  formatStats,
  buffList,
  ItemBuilder,
  itemSetList,
  assetToCanvas,
} from "@aether/shared";
import { Box, Icon, STYLE_NON_EMPTY, SLOT_SIZE, Tooltip, Text, Flex, Divider } from "@aether/ui";
import { Label, TextDivider, TOOLTIP_STYLE } from "./";

export default function ({ item }) {
  const [imageData, setImageData] = useState<any>();
  /* Loads the item canvas data out of the texture */
  useLayoutEffect(() => {
    if (!item) return;
    const asset = resolveAsset(item, { profile: { race: "human", gender: "female" } });
    if (!asset) return;
    assetToCanvas({ asset, tint: item?.tint, setImageData });
  }, [item]);

  return (
    <Box
      sx={{
        ...STYLE_NON_EMPTY({ rarity: item?.rarity }),
        width: SLOT_SIZE,
        height: SLOT_SIZE,
        "&:hover > .icon": {
          transition: ".1s ease all",
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
      ></Icon>
    </Box>
  );
}

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
      <Flex sx={TOOLTIP_STYLE}>
        <Text>
          {item?.name}
          {item?.slot == "spell" && <span> (Lv. {item?.ilvl})</span>}
        </Text>
        <Text color={item?.rarity}>
          {item?.rarity} {item?.type === "spell" ? "spell" : item?.base?.replaceAll("-", " ")}
        </Text>
        {Object.keys(stats)?.length > 0 && <TextDivider>Stats</TextDivider>}
        {Object.keys(stats).map((key) => (
          <Text key={key}>
            <Label>{key}:</Label>{" "}
            {Array.isArray(stats[key]) ? `${stats[key][0]} ↔ ${stats[key][1]}` : stats[key]}
          </Text>
        ))}
        {Object.keys(percentStats).map((key) => (
          <Text key={key}>
            <Label>{key}:</Label>{" "}
            {Array.isArray(percentStats[key])
              ? `${percentStats[key][0]}% ↔ ${percentStats[key][1]}%`
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
          const buffLevel = buffs[buffName];
          const buffStats = formatStats({
            duration: buffList?.[buffName]?.duration,
            ...Object.entries(buffList?.[buffName]?.stats || {}).reduce((acc, [key, value]) => {
              acc[key] = Number(value) * Number(buffLevel);
              return acc;
            }, {}),
          });
          return (
            <Fragment key={buffName}>
              <TextDivider>
                {buffName} Buff (Lv. {buffLevel})
              </TextDivider>
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
            {ItemBuilder.getItemCost(item)}
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
