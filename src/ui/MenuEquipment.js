import React from "react";
import { Flex, Text, useAppContext, Slot } from "./";

const MenuEquipment = () => {
  const { player, tabEquipment: show } = useAppContext();
  const equipment = Object.entries(player?.equipment || {});
  return (
    <Flex
      sx={{
        gap: 2,
        p: 2,
        flexWrap: "wrap",
        justifyContent: "end",
        display: show ? "flex" : "none",
        bg: "shadow.10",
        zIndex: 3,
        pointerEvents: "all",
      }}
    >
      <Text>Equipment</Text>
      <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", maxWidth: 592 }}>
        {equipment?.map(([slotKey, item]) => (
          <Slot location="equipment" icon={`../assets/icons/${slotKey}.png`} item={item} />
        ))}
      </Flex>
    </Flex>
  );
};

export default MenuEquipment;
