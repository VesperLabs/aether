import { MAX_INVENTORY_ITEMS } from "@/shared/rules/inventory";
import { arePropsEqualWithKeys } from "@/ui/are-props-equal";
import { Slot } from "./slot";
import { Flex, Text, Icon, MENU_MAX_WIDTH, Menu, MenuHeader } from "@/ui";
import { memo } from "react";

const GoldDisplay = ({ gold, sx }) => (
  <Flex sx={{ flex: 1, gap: 1, justifyContent: "end", alignItems: "center", ...sx }}>
    <Icon icon="./assets/icons/gold.png" size={16} />
    <Text>{gold || 0}</Text>
  </Flex>
);

export const MenuInventory = memo(
  ({ player, isOpen, setIsOpen, slotsEnabled = true }: any) => {
    const inventory = player?.inventory || [];
    const maxInventory = new Array(MAX_INVENTORY_ITEMS).fill(null);
    return (
      <Menu
        sx={{
          display: isOpen ? "flex" : "none",
        }}
      >
        <MenuHeader icon={`./assets/icons/bag.png`} onClick={() => setIsOpen(false)}>
          Inventory
        </MenuHeader>
        <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", maxWidth: MENU_MAX_WIDTH }}>
          {maxInventory?.map((_, idx) => (
            <Slot
              player={player}
              key={idx}
              location="inventory"
              slotKey={`${idx}`}
              icon={`./assets/icons/bag.png`}
              item={inventory?.[idx]}
              disabled={!slotsEnabled}
            />
          ))}
        </Flex>
        <GoldDisplay gold={player?.gold} sx={{ mt: 2 }} />
      </Menu>
    );
  },
  arePropsEqualWithKeys(["isOpen", "player.inventory", "player.gold"]),
);
