import { Flex, MENU_MAX_WIDTH, Menu, MenuHeader } from "@/ui";
import { Slot } from "./slot";
import { memo } from "react";
import type { BuiltItem } from "@/shared/content";
import type { HudCharacter } from "@/client/hud/app/context";
import { arePropsEqualWithKeys } from "@/ui/are-props-equal";

interface MenuBagProps {
  bagState: string[];
  player?: Partial<HudCharacter> | null;
  toggleBagState: (id: string) => void;
  slotsEnabled?: boolean;
}

export const MenuBag = memo(
  ({ bagState, player, toggleBagState, slotsEnabled = true }: MenuBagProps) => {
    return bagState?.map((id) => {
      const bag = player?.inventory?.find((item: BuiltItem) => item?.id === id);
      const maxInventory = new Array(bag?.space).fill(null);
      return (
        <Menu key={id}>
          <MenuHeader
            icon={`./assets/atlas/bag/${bag?.texture}.png`}
            onClick={() => toggleBagState(id)}
          >
            {bag?.name}
          </MenuHeader>
          <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", maxWidth: MENU_MAX_WIDTH }}>
            {maxInventory?.map((_, idx) => (
              <Slot
                player={player}
                key={`${bag?.id}-${idx}`}
                location="bag"
                slotKey={`${idx}`}
                bagId={bag?.id}
                icon={`./assets/atlas/bag/${bag?.texture}.png`}
                item={bag?.items?.[idx]}
                disabled={!slotsEnabled}
              />
            ))}
          </Flex>
        </Menu>
      );
    });
  },
  arePropsEqualWithKeys(["bagState", "player.inventory"]),
);
