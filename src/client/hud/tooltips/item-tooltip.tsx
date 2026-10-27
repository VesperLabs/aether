import { Fragment } from "react";
import { Flex, Text, Divider, Icon } from "@/ui";
import {
  buffList,
  itemSetList,
  ItemBuilder,
  spellDetails,
  type BuffName,
  type BuiltItem,
  type ItemSetName,
  type TriggerDefinition,
} from "@/content";
import type { HudCharacter } from "@/client/hud/app/context";
import { formatStats } from "@/rules/stats";
import { CONSUMABLES_BASES, itemHasRequiredStats } from "@/rules/inventory";
import { Label } from "@/ui";
import { TextDivider } from "@/ui";
import { Tooltip } from "@/ui";

interface ItemTooltipProps {
  player?: Partial<HudCharacter> | null;
  item?: BuiltItem | null;
  tooltipId: string;
  show: boolean;
}

export const ItemTooltip = ({ player, item, tooltipId, show }: ItemTooltipProps) => {
  const isSetActive = player?.state?.activeSets?.includes?.(item?.setName);
  if (!item) return;

  const setBonus = ItemBuilder.getSetInfo(item?.setName as string);
  const combinedStats = formatStats(item?.stats);
  const combinedSetStats = formatStats(setBonus?.stats);
  const combinedEffects = formatStats(item?.effects);

  const requirements = item?.requirements || {};
  const buffs = item?.buffs ?? {};
  const triggers = item?.triggers ?? [];
  const hasEffects = Object.keys(combinedEffects)?.length > 0;
  const isDoubleClickable = [...CONSUMABLES_BASES, "bag"].includes(item.base);
  const isSpell = item?.type === "spell";
  const numSetPieces = itemSetList?.[item?.setName as ItemSetName]?.pieces;

  return (
    <Tooltip id={tooltipId} isOpen={show}>
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
        {Object.keys(combinedStats)?.length > 0 && <TextDivider>Stats</TextDivider>}
        {Object.keys(combinedStats).map((key) => (
          <Text key={key}>
            <Label>{key}:</Label> {combinedStats[key]}
          </Text>
        ))}
        {Object.keys(item?.percentStats || {}).map((key) => (
          <Text key={key}>
            <Label>{key}:</Label> {item?.percentStats?.[key]}%
          </Text>
        ))}
        {hasEffects && <TextDivider>Effects</TextDivider>}
        {Object.keys(combinedEffects).map((key) => {
          return (
            <Text key={key}>
              <Label>{key}:</Label> {combinedEffects[key]}
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
            <Text
              key={key}
              color={
                itemHasRequiredStats({ requirements, player: player ?? undefined, key })
                  ? "text"
                  : "danger"
              }
            >
              <Label>{key}:</Label> {requirements[key]}
            </Text>
          );
        })}
        {setBonus && (
          <>
            <TextDivider>
              {setBonus?.name}{" "}
              <Text color={isSetActive ? "set" : "gray.500"} sx={{ fontSize: 0 }}>
                ({numSetPieces} piece)
              </Text>
            </TextDivider>
            {Object.keys(setBonus?.percentStats || {}).map((key) => {
              return (
                <Text key={key} color={isSetActive ? "set" : "gray.500"}>
                  <Label>{key}:</Label> {setBonus.percentStats[key]}%
                </Text>
              );
            })}
            {Object.keys(combinedSetStats).map((key) => (
              <Text key={key} color={isSetActive ? "set" : "gray.500"}>
                <Label>{key}:</Label> {combinedSetStats[key]}
              </Text>
            ))}
            {setBonus?.triggers?.map((trigger: TriggerDefinition, idx: number) => {
              return (
                <Text key={idx} color={isSetActive ? "set" : "gray.500"}>
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

        {isDoubleClickable && (
          <>
            <Text
              sx={{
                fontStyle: "italic",
                fontWeight: "normal",
                color: "gray.400",
                textTransform: "none",
              }}
            >
              Double click to {CONSUMABLES_BASES?.includes(item?.base) ? "consume" : "open"}
            </Text>
            <Divider />
          </>
        )}

        {isSpell &&
          (spellDetails as Record<string, { description?: string }>)?.[item?.base]?.description && (
            <>
              <Text
                sx={{
                  textAlign: "center",
                  maxWidth: 200,
                  fontStyle: "italic",
                  fontWeight: "normal",
                  color: "gray.400",
                  textTransform: "none",
                  whiteSpace: "normal",
                }}
              >
                {
                  (spellDetails as Record<string, { description?: string }>)?.[item?.base]
                    ?.description
                }
              </Text>
              <Divider />
            </>
          )}
        <Flex sx={{ alignItems: "center", gap: 2 }}>
          <Flex sx={{ alignItems: "center", gap: "2px" }}>
            <Icon icon="./assets/icons/gold.png" size={16} />
            {(item?.cost as number) * (item?.amount || 1)}
          </Flex>
          {item?.stats?.mpCost && (
            <Flex sx={{ alignItems: "center", gap: "2px" }}>
              <Icon icon="./assets/icons/mana.png" size={16} />
              {"-" + item?.stats?.mpCost}
            </Flex>
          )}
          {item?.stats?.hpCost && (
            <Flex sx={{ alignItems: "center", gap: "2px" }}>
              <Icon icon="./assets/icons/health.png" size={16} />
              {"-" + item?.stats?.hpCost}
            </Flex>
          )}
          {item?.stats?.spCost && (
            <Flex sx={{ alignItems: "center", gap: "2px" }}>
              <Icon icon="./assets/icons/stamina.png" size={16} />
              {"-" + item?.stats?.spCost}
            </Flex>
          )}
        </Flex>
      </Flex>
    </Tooltip>
  );
};
