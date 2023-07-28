import { Box, Flex } from "@aether/ui";
import Model from "./Model";
import { nasties } from "@aether/shared";
import RowTitle from "./RowTitle";

export default function () {
  return (
    <Flex sx={{ gap: 2, flexDirection: "column", mb: 4 }}>
      <RowTitle icon={"bounty"}>Monsters</RowTitle>
      <Flex sx={{ gap: 2, flexWrap: "wrap" }}>
        {Object.entries(nasties)?.map(([key, nasty]) => {
          return (
            <Box key={key}>
              <Model model={{ ...nasty, key }} />
            </Box>
          );
        })}
      </Flex>
    </Flex>
  );
}
