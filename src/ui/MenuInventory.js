import React from "react";
import { Flex, Text, useAppContext, Slot } from "./";

const MenuInventory = () => {
  const { hero, tabInventory: show } = useAppContext();
  const inventory = hero?.inventory || [];
  const maxInventory = new Array(30).fill(null);

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
      <Text>Inventory</Text>
      <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", maxWidth: 592 }}>
        {maxInventory?.map((item, idx) => (
          <Slot
            location="inventory"
            slotKey={idx}
            icon="./assets/icons/pouch.png"
            item={inventory?.[idx]}
          />
        ))}
      </Flex>
    </Flex>
  );
};

export default MenuInventory;
