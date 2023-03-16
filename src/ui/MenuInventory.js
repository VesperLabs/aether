import React from "react";
import { Flex, Text, useAppContext, Slot } from "./";

const MenuInventory = () => {
  const { player, tabInventory: show } = useAppContext();
  const inventory = Object.entries(player?.inventory || {});
  const maxInventory = new Array(30).fill(null);
  return (
    <Flex
      sx={{
        gap: 2,
        p: 2,
        flexWrap: "wrap",
        justifyContent: "end",
        display: show ? "flex" : "none",
        bg: "shadow.10",
        pointerEvents: "all",
      }}
    >
      <Text>Inventory</Text>
      <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", maxWidth: 592 }}>
        {maxInventory?.map((i) => (
          <Slot location="inventory" icon="./assets/icons/pouch.png" item={inventory?.[i]} />
        ))}
      </Flex>
    </Flex>
  );
};

export default MenuInventory;
