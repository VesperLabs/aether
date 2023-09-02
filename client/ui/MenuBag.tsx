import { Flex } from "@aether/ui";
import { Menu, Slot, MenuHeader, MENU_MAX_WIDTH } from "./";
import { memo } from "react";
import { arePropsEqualWithKeys } from "@aether/shared";

const MenuBag = memo(({ bagState, player, toggleBagState, slotsEnabled = true }: any) => {
  return bagState?.map((id) => {
    const bag = player?.inventory?.find((item: Item) => item?.id === id);
    const maxInventory = new Array(bag?.space).fill(null);
    return (
      <Menu>
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
}, arePropsEqualWithKeys(["bagState", "player.inventory"]));

export default MenuBag;
