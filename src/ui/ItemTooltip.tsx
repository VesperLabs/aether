import { Flex, useAppContext, Text, Divider, Icon, TOOLTIP_STYLE } from "./";
import itemSetList from "../../shared/data/itemSetList.json";
import { Tooltip } from "react-tooltip";

const combineDamageStats = (stats) =>
  Object.entries(stats).reduce((acc, [key, value]) => {
    if (key.includes("Damage")) {
      const keyWithoutPrefix = key.replace("min", "").replace("max", "");
      if (!acc.hasOwnProperty(keyWithoutPrefix)) {
        acc[keyWithoutPrefix] = `${stats[`min${keyWithoutPrefix}`]} - ${
          stats[`max${keyWithoutPrefix}`]
        }`;
      }
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});

const Label = (props) => <Text sx={{ fontWeight: "normal" }} {...props} />;

const ItemTooltip = ({ item, show }) => {
  const { hero } = useAppContext();
  const isSetActive = hero?.state?.activeSets?.includes?.(item?.setName);
  const setDetails = itemSetList?.[item?.setName];
  if (!item) return;

  const combinedStats = combineDamageStats(item?.stats);
  const combinedEffects = combineDamageStats(item?.effects);

  return (
    <Tooltip id={item?.id} isOpen={show} style={TOOLTIP_STYLE}>
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
          {item?.slot == "spell" && <span> (Level {item?.ilvl})</span>}
        </Text>
        <Text color={item?.rarity}>
          {item?.rarity} {item?.base}
        </Text>
        <Divider />
        {item?.slot !== "stackable" && (
          <Text>
            <Label>Slot:</Label> {item?.slot}
          </Text>
        )}
        {Object.keys(combinedStats).map((key) => (
          <Text key={key}>
            <Label>{key}:</Label> {combinedStats[key]}
          </Text>
        ))}
        {Object.keys(item?.percentStats).map((key) => (
          <Text key={key}>
            <Label>{key}:</Label> {item?.percentStats[key]}%
          </Text>
        ))}
        {Object.keys(combinedEffects).map((key) => {
          if (key == "hp") {
            return (
              <Text key={key}>
                <Label>+</Label> {combinedEffects[key]}% hp
              </Text>
            );
          } else {
            return (
              <Text key={key}>
                <Label>{key}:</Label> {combinedEffects[key]}
              </Text>
            );
          }
        })}
        {item?.setBonus && <Divider />}
        {item?.setBonus && <Text color={isSetActive ? "set" : "gray.500"}>{setDetails?.name}</Text>}
        {item?.setBonus && <Divider />}
        {item?.setBonus &&
          Object.keys(item?.setBonus.percentStats).map((key) => {
            return (
              <Text key={key} color={isSetActive ? "set" : "gray.500"}>
                <Label>{key}:</Label> {item?.setBonus.percentStats[key]}%
              </Text>
            );
          })}
        {item?.setBonus &&
          Object.keys(item?.setBonus.stats).map((key) => {
            return (
              <Text key={key} color={isSetActive ? "set" : "gray.500"}>
                <Label>{key}:</Label> {item?.setBonus.stats[key]}
              </Text>
            );
          })}
        <Divider />
        <Flex sx={{ alignItems: "center", gap: 2 }}>
          <Flex sx={{ alignItems: "center", gap: "2px" }}>
            <Icon icon="../assets/icons/gold.png" size={16} />
            {item?.cost * (item?.amount || 1)}
          </Flex>
          {item?.mpCost && (
            <Flex sx={{ alignItems: "center", gap: "2px" }}>
              <Icon icon="../assets/icons/mana.png" size={16} />
              {item?.mpCost}
            </Flex>
          )}
        </Flex>
      </Flex>
    </Tooltip>
  );
};

export default ItemTooltip;
