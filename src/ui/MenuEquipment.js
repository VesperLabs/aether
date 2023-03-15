import React from "react";
import { Flex, Text, useAppContext, Slot } from "./";

const MenuEquipment = () => {
  const { player, currentTabEquipment: show } = useAppContext();
  const equipment = Object.entries(player?.equipment || {});
  return (
    <Flex
      sx={{
        gap: 2,
        p: 2,
        flexWrap: "wrap",
        justifyContent: "end",
        visibility: show ? "visible" : "hidden",
        bg: "shadow.10",
      }}
    >
      <Text>Equipment</Text>
      <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end" }}>
        {equipment?.map(([key, item]) => (
          <Slot icon={`../assets/icons/${key}.png`} item={item} />
        ))}
      </Flex>
    </Flex>
  );
};

export default MenuEquipment;
