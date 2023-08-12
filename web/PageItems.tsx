import { Box, Flex } from "@aether/ui";
import Slot from "./Slot";
import { itemList } from "@aether/shared";
import RowTitle from "./RowTitle";
import { Fragment } from "react";

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
    const magicItems = Object.entries(itemList?.[type]?.["magic"] || {})?.map(
      ([key, v]: [string, Item]) => ({
        key,
        rarity: "magic",
        ...v,
      })
    );
    const rareItems = Object.entries(itemList?.[type]?.["rare"] || {})?.map(
      ([key, v]: [string, Item]) => ({
        key,
        rarity: "rare",
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
    const allItems = [...commonItems, ...magicItems, ...rareItems, ...uniqueItems, ...setItems];

    return (
      <Flex key={type} sx={{ gap: 2, flexDirection: "column", mb: 4 }}>
        <RowTitle icon={type}>{type}</RowTitle>
        {[...Array(99)]
          .map((_, index) => index + 1)
          .map((ilvl, idx) => {
            const items = allItems?.filter((i: any) => i?.ilvl === ilvl);
            const hasItems = items?.length > 0;
            return hasItems ? (
              <Fragment key={`${ilvl}-${idx}`}>
                <RowTitle sx={{ background: "shadow.10", fontWeight: "normal" }}>
                  Tier {ilvl}
                </RowTitle>
                <Flex sx={{ flexWrap: "wrap", gap: 2 }}>
                  {items?.map((item) => {
                    return (
                      <Box key={item?.key + item?.name}>
                        <Slot item={{ ...item }} />
                      </Box>
                    );
                  })}
                </Flex>
              </Fragment>
            ) : null;
          })}
      </Flex>
    );
  });
}
