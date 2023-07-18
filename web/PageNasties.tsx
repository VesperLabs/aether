import { Box, Flex } from "@aether/ui";
import Model from "./Model";
import { nasties } from "@aether/shared";

export default function () {
  return (
    <Flex sx={{ gap: 2, flexWrap: "wrap" }}>
      {Object.entries(nasties)?.map(([key, nasty]) => {
        return (
          <Box key={key}>
            <Model model={{ ...nasty, key }} />
          </Box>
        );
      })}
    </Flex>
  );
}
