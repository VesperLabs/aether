import { Fragment } from "react";
import { Box, Flex, Icon } from "@aether/ui";
import Slot from "./Slot";
import { itemList } from "@aether/shared";

const resolveTypeIcon = (type) => {
  if (type === "shield") {
    type = "handLeft";
  }
  if (type === "weapon") {
    type = "handRight";
  }
  if (type === "ring") {
    type = "ring1";
  }
  if (type === "stackable") {
    type = "mana";
  }
  if (type === "spell") {
    type = "book";
  }
  return `assets/icons/${type}.png`;
};

export default function () {
  const types = Object.keys(itemList);
  //const rarities = ["common", "set", "unique"];
  return types?.map((type) => {
    const commonItems = Object.entries(itemList?.[type]?.["common"] || {})?.map(
      ([key, v]: [string, Item]) => ({
        key,
        rarity: "common",
        ...v,
      })
    );
    const uniqueItems = Object.entries(itemList?.[type]?.["unique"] || {})?.map(
      ([key, v]: [string, Item]) => ({
        key,
        rarity: "unique",
        ...v,
      })
    );
    const setItems = Object.entries(itemList?.[type]?.["set"] || {})?.map(
      ([key, v]: [string, Item]) => ({
        key,
        rarity: "set",
        ...v,
      })
    );
    const allItems = [...commonItems, ...uniqueItems, ...setItems];

    return (
      <Flex sx={{ gap: 2, flexDirection: "column", mb: 4 }}>
        <RowTitle>
          <Icon icon={resolveTypeIcon(type)} /> {type}
        </RowTitle>
        {[...Array(99)]
          .map((_, index) => index + 1)
          .map((ilvl) => {
            const items = allItems?.filter((i: any) => i?.ilvl === ilvl);
            const hasItems = items?.length > 0;
            return hasItems ? (
              <>
                <RowTitle sx={{ background: "shadow.10", fontWeight: "normal" }}>
                  Tier {ilvl}
                </RowTitle>
                <Flex sx={{ flexWrap: "wrap", gap: 2 }}>
                  {items?.map((item) => (
                    <Box key={ilvl}>
                      <Slot item={{ ...item }} />
                    </Box>
                  ))}
                </Flex>
              </>
            ) : null;
          })}
      </Flex>
    );
  });
}

const RowTitle = ({ sx, ...props }: any) => (
  <Flex
    sx={{
      gap: 1,
      alignItems: "center",
      fontWeight: "bold",
      background: "shadow.20",
      px: 2,
      py: 1,
      borderRadius: 8,
      textTransform: "capitalize",
      width: "100%",
      ...sx,
    }}
    {...props}
  />
);
