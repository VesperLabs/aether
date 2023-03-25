import React from "react";
import { Flex, Text, useAppContext, Portrait } from "./";

const MenuKeeper = () => {
  const { keeper, tabKeeper: show } = useAppContext();

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
      <Portrait user={keeper} />
      <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", maxWidth: 592 }}></Flex>
    </Flex>
  );
};

export default MenuKeeper;
