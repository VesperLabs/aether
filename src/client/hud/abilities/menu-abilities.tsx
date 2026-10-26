import { Flex, MENU_MAX_WIDTH, Menu, MenuHeader } from "@/ui";
import { Slot } from "@/client/hud/inventory/slot";
import { memo } from "react";
import { arePropsEqualWithKeys } from "@/shared";

export const MenuAbilities = memo(
  ({ player, isOpen, setIsOpen, slotsEnabled = true }: any) => {
    const abilities = Object.entries(player?.abilities || {});

    return (
      <Menu
        sx={{
          display: isOpen ? "flex" : "none",
          alignItems: "end",
          flexDirection: "column",
        }}
      >
        <MenuHeader icon={`./assets/icons/book.png`} onClick={() => setIsOpen(false)}>
          Abilities
        </MenuHeader>
        <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", maxWidth: MENU_MAX_WIDTH }}>
          {abilities?.map(([slotKey, item]: [string, Item]) => (
            <Slot
              player={player}
              key={slotKey}
              location="abilities"
              slotKey={slotKey}
              icon="./assets/icons/book.png"
              item={item}
              disabled={!slotsEnabled}
            />
          ))}
        </Flex>
      </Menu>
    );
  },
  arePropsEqualWithKeys(["isOpen", "player.abilities", "player.activeItemSlots", "player.stats"]),
);
