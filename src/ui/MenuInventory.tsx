import { Flex, Text, useAppContext, Slot, Icon, MenuHeader } from "./";

const MenuInventory = () => {
  const { hero, tabInventory, setTabInventory } = useAppContext();
  const inventory = hero?.inventory || [];
  const maxInventory = new Array(30).fill(null);

  return (
    <Flex
      sx={{
        flexDirection: "column",
        gap: 2,
        p: 2,
        bg: "shadow.30",
        pointerEvents: "all",
        display: tabInventory ? "flex" : "none",
        "&:hover": {
          zIndex: 999,
        },
      }}
    >
      <Flex sx={{ flexWrap: "wrap", justifyContent: "end", gap: 2, flex: 1 }}>
        <MenuHeader onClick={() => setTabInventory(false)}>Inventory</MenuHeader>
        <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", maxWidth: 592 }}>
          {maxInventory?.map((item, idx) => (
            <Slot
              key={idx}
              location="inventory"
              slotKey={`${idx}`}
              icon="./assets/icons/pouch.png"
              item={inventory?.[idx]}
            />
          ))}
        </Flex>
      </Flex>
      <Flex sx={{ gap: 1, justifyContent: "end" }}>
        <Icon icon="../assets/icons/gold.png" size={16} />
        <Text>{hero?.gold || 0}</Text>
      </Flex>
    </Flex>
  );
};

export default MenuInventory;
