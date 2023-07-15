import { Flex, Menu, Text, useAppContext, Slot, Icon, MenuHeader, MENU_MAX_WIDTH } from "./";

const GoldDisplay = ({ gold, sx }) => (
  <Flex sx={{ flex: 1, gap: 1, justifyContent: "end", alignItems: "center", ...sx }}>
    <Icon icon="../assets/icons/gold.png" size={16} />
    <Text>{gold || 0}</Text>
  </Flex>
);

const MenuInventory = () => {
  const { hero, tabInventory, setTabInventory } = useAppContext();
  const inventory = hero?.inventory || [];
  const maxInventory = new Array(30).fill(null);

  return (
    <Menu sx={{ display: tabInventory ? "block" : "none" }}>
      <Flex sx={{ flexWrap: "wrap", justifyContent: "end", gap: 2, flex: 1 }}>
        <MenuHeader icon={`../assets/icons/bag.png`} onClick={() => setTabInventory(false)}>
          Inventory
        </MenuHeader>
        <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", maxWidth: MENU_MAX_WIDTH }}>
          {maxInventory?.map((_, idx) => (
            <Slot
              key={idx}
              location="inventory"
              slotKey={`${idx}`}
              icon={`../assets/icons/bag.png`}
              item={inventory?.[idx]}
            />
          ))}
        </Flex>
      </Flex>
      <GoldDisplay gold={hero?.gold} sx={{ mt: 2 }} />
    </Menu>
  );
};

export default MenuInventory;
