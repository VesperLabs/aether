import React from "react";
import { Flex, Text, useAppContext, Slot } from "./";

const MenuEquipment = () => {
  const { hero, tabEquipment: show } = useAppContext();
  const equipment = Object.entries(hero?.equipment || {});
  if (!show) return;
  return (
    <Flex
      sx={{
        gap: 2,
        p: 2,
        flexWrap: "wrap",
        justifyContent: "end",
        bg: "shadow.10",
        pointerEvents: "all",
        "&:hover": {
          zIndex: 999,
        },
      }}
    >
      <Text>Equipment</Text>
      <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", maxWidth: 592 }}>
        {equipment?.map(([slotKey, item]) => (
          <Slot
            location="equipment"
            slotKey={slotKey}
            icon={`../assets/icons/${slotKey}.png`}
            item={item}
          />
        ))}
      </Flex>
    </Flex>
  );
};

export default MenuEquipment;
