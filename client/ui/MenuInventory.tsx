import { MAX_INVENTORY_ITEMS, arePropsEqualWithKeys } from "@aether/shared";
import { Menu, Slot, MenuHeader, MENU_MAX_WIDTH } from "./";
import { Flex, Text, Icon } from "@aether/ui";
import { memo } from "react";

const GoldDisplay = ({ gold, sx }) => (
  <Flex sx={{ flex: 1, gap: 1, justifyContent: "end", alignItems: "center", ...sx }}>
    <Icon icon="./assets/icons/gold.png" size={16} />
    <Text>{gold || 0}</Text>
  </Flex>
);

const MenuInventory = memo(({ player, isOpen, setIsOpen }: any) => {
  const inventory = player?.inventory || [];
  const maxInventory = new Array(MAX_INVENTORY_ITEMS).fill(null);
  return (
    <Menu sx={{ display: isOpen ? "block" : "none" }}>
      <Flex sx={{ flexWrap: "wrap", justifyContent: "end", gap: 2, flex: 1 }}>
        <MenuHeader icon={`./assets/icons/bag.png`} onClick={() => setIsOpen(false)}>
          Inventory
        </MenuHeader>
        <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", maxWidth: MENU_MAX_WIDTH }}>
          {maxInventory?.map((_, idx) => (
            <Slot
              key={idx}
              location="inventory"
              slotKey={`${idx}`}
              icon={`./assets/icons/bag.png`}
              item={inventory?.[idx]}
            />
          ))}
        </Flex>
      </Flex>
      <GoldDisplay gold={player?.gold} sx={{ mt: 2 }} />
    </Menu>
  );
}, arePropsEqualWithKeys(["isOpen", "player.inventory", "player.gold"]));

export default MenuInventory;
