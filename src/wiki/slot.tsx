import { useLayoutEffect, useState, Fragment } from "react";
import {
  resolveAsset,
  buffList,
  ItemBuilder,
  itemSetList,
  type BuiltItem,
  type BuffName,
  type TriggerDefinition,
  type ItemSetName,
} from "@/content";
import { formatStats } from "@/rules/stats";
import { assetToCanvas } from "@/ui";
import {
  Box,
  Icon,
  STYLE_NON_EMPTY,
  SLOT_SIZE,
  Tooltip,
  TooltipContent,
  Text,
  Flex,
  Divider,
  Label,
  TextDivider,
} from "@/ui";

/** An item as the wiki lists it: the definition with its tier, not an item a player owns. */
export type WikiItem = Partial<BuiltItem>;

export function Slot({ item }: { item: WikiItem }) {
  const [imageData, setImageData] = useState<string>();
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
        ...STYLE_NON_EMPTY({ rarity: item?.rarity as string }),
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

const ItemTooltip = ({ item }: { item: WikiItem }) => {
  const stats = formatStats(item?.stats || {});
  const effects = formatStats(item?.effects || {});
  const percentStats = formatStats(item?.percentStats || {});
  const requirements = formatStats(item?.requirements || {});
  const buffs = item?.buffs || {};
  const triggers = item?.triggers || [];

  const setBonus = ItemBuilder.getSetInfo(item?.setName as string);
  const numSetPieces = itemSetList?.[item?.setName as ItemSetName]?.pieces;

  const setStats = formatStats(setBonus?.stats || {});

  return (
    <Tooltip id={item?.key}>
      <TooltipContent>
        <Text>
          {item?.name}
          {item?.slot == "spell" && <span> (Lv. {item?.ilvl})</span>}
        </Text>
        <Text color={item?.rarity}>
          {item?.rarity} {item?.slot === "spell" ? "spell" : item?.base?.replaceAll("-", " ")}
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
          const buff = buffList?.[buffName as BuffName] as
            | { duration?: number; stats?: Record<string, number> }
            | undefined;
          const buffStats = formatStats({
            duration: Number(buff?.duration) * Number(buffLevel),
            ...Object.entries(buff?.stats || {}).reduce<Record<string, number>>(
              (acc, [key, value]) => {
                acc[key] = Number(value) * Number(buffLevel);
                return acc;
              },
              {},
            ),
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
        {triggers?.map((trigger: TriggerDefinition, idx: number) => {
          return (
            <Text key={idx}>
              <Label>
                {Math.floor(100 / trigger?.chance)}% chance{" "}
                {trigger?.event === "onAttackHit" ? "on hit" : "on hurt"}:{" "}
              </Label>
              {trigger?.name}{" "}
              <Text sx={{ fontSize: 0, color: "gray.400" }}>(Lv. {trigger?.level})</Text>
            </Text>
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
              {setBonus?.name}{" "}
              <Text color="set" sx={{ fontSize: 0 }}>
                ({numSetPieces} piece)
              </Text>
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
            {setBonus?.triggers?.map((trigger: TriggerDefinition, idx: number) => {
              return (
                <Text key={idx} color={"set"}>
                  <Label>
                    {Math.floor(100 / trigger?.chance)}% chance{" "}
                    {trigger?.event === "onAttackHit" ? "on hit" : "on hurt"}:{" "}
                  </Label>
                  {trigger?.name}{" "}
                  <Text sx={{ fontSize: 0, color: "gray.400" }}>(Lv. {trigger?.level})</Text>
                </Text>
              );
            })}
          </>
        )}
        {item?.space && (
          <>
            <TextDivider>Space</TextDivider>
            {`${item?.items?.filter((i) => i)?.length || 0} / ${item?.space}`}
          </>
        )}
        <Divider />
        <Flex sx={{ alignItems: "center", gap: 2 }}>
          <Flex sx={{ alignItems: "center", gap: "2px" }}>
            <Icon icon="./assets/icons/gold.png" size={16} />
            {ItemBuilder.getItemCost(item)}
          </Flex>
          {item?.stats?.mpCost && (
            <Flex sx={{ alignItems: "center", gap: "2px" }}>
              <Icon icon="./assets/icons/mana.png" size={16} />
              {"-" + item?.stats?.mpCost}
            </Flex>
          )}
          {item?.stats?.spCost && (
            <Flex sx={{ alignItems: "center", gap: "2px" }}>
              <Icon icon="./assets/icons/stamina.png" size={16} />
              {"-" + item?.stats?.spCost}
            </Flex>
          )}
        </Flex>
      </TooltipContent>
    </Tooltip>
  );
};
