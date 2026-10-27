import { Box, Flex } from "@/ui";
import { Slot, type WikiItem } from "./slot";
import { itemList } from "@/content";
import { RowTitle } from "./row-title";
import { Fragment } from "react";

/** The item list as the wiki reads it: type, then rarity, then key. */
const listedItems = itemList as unknown as Record<string, Record<string, Record<string, WikiItem>>>;

const RARITIES = ["common", "magic", "rare", "unique", "set"];

export function PageItems() {
  const types = Object.keys(itemList);
  //const rarities = ["common", "set", "unique"];
  return types?.map((type) => {
    const allItems = RARITIES.flatMap((rarity) =>
      Object.entries(listedItems[type]?.[rarity] || {}).map(([key, v]) => ({
        key,
        rarity,
        ...v,
      })),
    );

    return (
      <Flex key={type} sx={{ gap: 2, flexDirection: "column", mb: 4 }}>
        <RowTitle icon={type}>{type}</RowTitle>
        {[...Array(99)]
          .map((_, index) => index + 1)
          .map((ilvl, idx) => {
            const items = allItems?.filter((i) => i?.ilvl === ilvl);
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
