import { Box, Flex } from "@/ui";
import { NpcRender } from "./npc-render";
import { nasties } from "@/shared";
import { RowTitle } from "./row-title";

export function PageNasties() {
  return (
    <Flex sx={{ gap: 2, flexDirection: "column", mb: 4 }}>
      <RowTitle icon={"bounty"}>Monsters</RowTitle>
      <Flex sx={{ gap: 2, flexWrap: "wrap" }}>
        {Object.entries(nasties)?.map(([key, nasty]) => {
          return (
            <Box key={key}>
              <NpcRender model={{ ...nasty, key }} />
            </Box>
          );
        })}
      </Flex>
    </Flex>
  );
}
