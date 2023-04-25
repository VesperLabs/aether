import { Flex, Menu, Text, useAppContext, Slot, Icon, MenuHeader } from "./";

const GoldDisplay = ({ gold }) => (
  <Flex sx={{ flex: 1, gap: 1, justifyContent: "end", alignItems: "center", pr: 2 }}>
    <Icon icon="../assets/icons/gold.png" size={16} />
    <Text>{gold || 0}</Text>
  </Flex>
);

const MenuInventory = () => {
  const { hero, tabInventory, setTabInventory } = useAppContext();
  const inventory = hero?.inventory || [];
  const maxInventory = new Array(30).fill(null);

  return (
    <Menu
      sx={{
        display: tabInventory ? "flex" : "none",
      }}
    >
      <Flex sx={{ flexWrap: "wrap", justifyContent: "end", gap: 2, flex: 1 }}>
        <MenuHeader icon="bag" onClick={() => setTabInventory(false)}>
          Inventory
          <GoldDisplay gold={hero?.gold} />
        </MenuHeader>
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
    </Menu>
  );
};

export default MenuInventory;
