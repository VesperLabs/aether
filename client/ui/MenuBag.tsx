import { Flex, Text, Icon } from "@aether/ui";
import { Menu, useAppContext, Slot, MenuHeader, MENU_MAX_WIDTH } from "./";

const MenuBag = ({ id }) => {
  const { hero, toggleBagState } = useAppContext();
  const bag = hero?.inventory?.find((item: Item) => item?.id === id);
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
            key={`${bag?.id}-${idx}`}
            location="bag"
            slotKey={`${idx}`}
            bagId={bag?.id}
            icon={`./assets/atlas/bag/${bag?.texture}.png`}
            item={bag?.items?.[idx]}
          />
        ))}
      </Flex>
    </Menu>
  );
};

export default MenuBag;
