import { Flex, MENU_MAX_WIDTH, Menu, MenuHeader } from "@/ui";
import { Slot } from "@/client/hud/inventory/slot";
import { arePropsEqualWithKeys } from "@/ui";
import { memo } from "react";
import type { BuiltItem } from "@/content";
import type { CharacterMenuProps } from "@/client/hud/menu/menu-props";

export const MenuEquipment = memo(
  ({ player, isOpen, setIsOpen, slotsEnabled = true }: CharacterMenuProps) => {
    const equipment = Object.entries<BuiltItem>(player?.equipment || {});
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
          {equipment?.map(([slotKey, item]: [string, BuiltItem]) => (
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
