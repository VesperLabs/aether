import { Box, Flex } from "@aether/ui";
import Slot from "./Slot";
import { itemList } from "@aether/shared";

export default function () {
  const types = Object.keys(itemList);
  const rarities = ["common", "set", "unique"];
  return types?.map((type) => {
    const commonItems = Object.entries(itemList?.[type]?.["common"]);
    const uniqueItems = Object.entries(itemList?.[type]?.["unique"] || {});
    const setItems = Object.entries(itemList?.[type]?.["set"] || {});
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
