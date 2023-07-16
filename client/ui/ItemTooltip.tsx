import { Fragment } from "react";
import { Flex, Text, Divider, Icon, Tooltip } from "@aether/ui";
import { buffList, itemSetList, ItemBuilder, formatStats } from "@aether/shared";
import { useAppContext } from "./";

const Label = (props) => <Text sx={{ fontWeight: "normal" }} {...props} />;

const ItemTooltip = ({ item, tooltipId, show }) => {
  const { hero } = useAppContext();
  const isSetActive = hero?.state?.activeSets?.includes?.(item?.setName);
  if (!item) return;

  const setBonus = ItemBuilder.getSetInfo(item?.setName);
  const combinedStats = formatStats(item?.stats);
  const combinedSetStats = formatStats(setBonus?.stats);
  const combinedEffects = formatStats(item?.effects);

  const requirements = item?.requirements || {};
  const buffs = item?.buffs ?? {};
  const hasEffects = Object.keys(combinedEffects)?.length > 0;
  const hasBuffs = Object.keys(buffs)?.length > 0;
  const isDoubleClickable = ["food", "potion", "bag"].includes(item.base);
  const numSetPieces = itemSetList?.[item?.setName]?.pieces;

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
            <Label>{key}:</Label> {item?.percentStats[key]}%
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
          const hasRequiredStats = hero?.stats?.[key] >= requirements[key];
          return (
            <Text key={key} color={hasRequiredStats ? "text" : "danger"}>
              <Label>{key}:</Label> {requirements[key]}
            </Text>
          );
        })}
        {setBonus && (
          <>
            <TextDivider>
              Set Bonus <Text color={isSetActive ? "set" : "gray.500"}>({numSetPieces} piece)</Text>
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
          </>
        )}
        {item?.space && (
          <>
            <TextDivider>Space</TextDivider>
            {`${item?.items?.filter((i: Item) => i)?.length || 0} / ${item?.space}`}
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
              Double click to {["food", "potion"]?.includes(item?.base) ? "consume" : "open"}
            </Text>
            <Divider />
          </>
        )}
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

const TextDivider = ({ children, sx }: any) => (
  <>
    <Divider sx={{ pt: 2, zIndex: -1 }} />
    <Text sx={{ mt: -3, pb: 2, mb: -1, color: "gray.500", ...sx }}>{children}</Text>
  </>
);

export default ItemTooltip;
