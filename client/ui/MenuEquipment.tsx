import { Flex } from "@aether/ui";
import { Menu, MenuHeader, Slot, MENU_MAX_WIDTH } from "./";
import { arePropsEqualWithKeys } from "@aether/shared";
import { memo } from "react";

const MenuEquipment = memo(({ player, isOpen, setIsOpen }: any) => {
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
            location="equipment"
            slotKey={slotKey}
            icon={`./assets/icons/${slotKey}.png`}
            item={item}
          />
        ))}
      </Flex>
    </Menu>
  );
}, arePropsEqualWithKeys(["isOpen", "player.equipment", "player.activeItemSlots"]));

export default MenuEquipment;
