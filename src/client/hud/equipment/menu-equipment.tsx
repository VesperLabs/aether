import { Flex, MENU_MAX_WIDTH, Menu, MenuHeader } from "@/ui";
import { Slot } from "@/client/hud/inventory/slot";
import { arePropsEqualWithKeys } from "@/ui/are-props-equal";
import { memo } from "react";

export const MenuEquipment = memo(
  ({ player, isOpen, setIsOpen, slotsEnabled = true }: any) => {
    const equipment = Object.entries(player?.equipment || {});
    return (
      <Menu
        sx={{
          display: isOpen ? "flex" : "none",
        }}
      >
        <MenuHeader icon={`./assets/icons/helmet.png`} onClick={() => setIsOpen(false)}>
          Equipment
        </MenuHeader>
        <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", maxWidth: MENU_MAX_WIDTH }}>
          {equipment?.map(([slotKey, item]: [string, Item]) => (
            <Slot
              key={slotKey}
              player={player}
              location="equipment"
              slotKey={slotKey}
              icon={`./assets/icons/${slotKey}.png`}
              item={item}
              disabled={!slotsEnabled}
            />
          ))}
        </Flex>
      </Menu>
    );
  },
  arePropsEqualWithKeys(["isOpen", "player.equipment", "player.activeItemSlots"]),
);
