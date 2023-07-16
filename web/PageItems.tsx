import { Box, Flex, Text } from "@aether/ui";
import Slot from "./Slot";
import { getItemCost, itemList } from "@aether/shared";

function mergeStats(jsonData) {
  const mergedData = JSON.parse(JSON.stringify(jsonData));

  for (const itemType in mergedData) {
    const itemRarities = mergedData[itemType];

    if (itemRarities.hasOwnProperty("common")) {
      const commonItems = itemRarities["common"];
      const commonKeys = Object.keys(commonItems);

      for (const itemRarity in itemRarities) {
        const items = itemRarities[itemRarity];

        for (const itemKey in items) {
          const item = items[itemKey];

          const baseItem = commonKeys
            .map((key) => commonItems[key])
            .find((commonItem) => commonItem?.base === item?.base && commonItem?.ilvl === 1);

          if (baseItem) {
            const ilvlMultiplier = item?.ilvl || 1;

            item.stats = { ...multiplyValues(baseItem.stats, ilvlMultiplier), ...item.stats };
            item.requirements = {
              ...multiplyValues(baseItem.requirements, ilvlMultiplier),
              ...item.requirements,
            };
            item.effects = { ...multiplyValues(baseItem.effects, ilvlMultiplier), ...item.effects };
            item.cost = getItemCost({ ...item, rarity: itemRarity });
          }
        }
      }
    }
  }

  return mergedData;
}

function multiplyValues(obj, multiplier) {
  const multipliedObj = {};
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === "number") {
      multipliedObj[key] = value * multiplier;
    } else if (
      Array.isArray(value) &&
      value.length === 2 &&
      value.every((v) => typeof v === "number")
    ) {
      multipliedObj[key] = value.map((v) => v * multiplier);
    } else {
      multipliedObj[key] = value;
    }
  }
  return multipliedObj;
}

export default function () {
  const mergedItemList = mergeStats(itemList);
  const types = Object.keys(mergedItemList);
  const rarities = ["common", "set", "unique"];
  return types?.map((type) => {
    const commonItems = Object.entries(mergedItemList?.[type]?.["common"]);
    const uniqueItems = Object.entries(mergedItemList?.[type]?.["unique"] || {});
    const setItems = Object.entries(mergedItemList?.[type]?.["set"] || {});
    return (
      <Box key={type}>
        <Box
          sx={{
            fontWeight: "bold",
            my: 2,
            background: "shadow.20",
            px: 2,
            py: 1,
            borderRadius: 8,
            textTransform: "capitalize",
          }}
        >
          {type}
        </Box>
        <Flex sx={{ gap: 2, flexWrap: "wrap" }}>
          {commonItems?.map(([key, item]: [string, Item]) => {
            return (
              <Box key={key}>
                <Slot item={{ ...item, rarity: "common", key }} />
              </Box>
            );
          })}
          {setItems?.map(([key, item]: [string, Item]) => {
            return (
              <Box key={key}>
                <Slot item={{ ...item, rarity: "set", key }} />
              </Box>
            );
          })}
          {uniqueItems?.map(([key, item]: [string, Item]) => {
            return (
              <Box key={key}>
                <Slot item={{ ...item, rarity: "unique", key }} />
              </Box>
            );
          })}
        </Flex>
      </Box>
    );
  });
}
