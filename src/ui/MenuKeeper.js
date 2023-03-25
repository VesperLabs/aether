import React from "react";
import { Flex, Text, useAppContext, Portrait, Box } from "./";

const MenuKeeper = () => {
  const { keeper, tabKeeper: show } = useAppContext();
  const { dialogues } = keeper?.keeperData ?? {};

  return (
    <Flex
      sx={{
        gap: 2,
        p: 2,
        flexWrap: "wrap",
        justifyContent: "end",
        bg: "shadow.30",
        pointerEvents: "all",
        display: show ? "flex" : "none",
        "&:hover": {
          zIndex: 999,
        },
      }}
    >
      <Text>{keeper?.profile?.userName}</Text>
      <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", width: 592 }}>
        <Portrait user={keeper} />
        <Box sx={{ flex: 1, bg: "shadow.30", p: 3, borderRadius: 6 }}>
          <Text dangerouslySetInnerHTML={{ __html: dialogues?.greet }} />
        </Box>
      </Flex>
    </Flex>
  );
};

export default MenuKeeper;
