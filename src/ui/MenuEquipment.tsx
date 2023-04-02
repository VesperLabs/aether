import { Flex, Text, useAppContext, Slot } from "./";

const MenuEquipment = () => {
  const { hero, tabEquipment: show } = useAppContext();
  const equipment = Object.entries(hero?.equipment || {});

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
      <Text>Equipment</Text>
      <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", maxWidth: 592 }}>
        {equipment?.map(([slotKey, item]) => (
          <Slot
            key={slotKey}
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
