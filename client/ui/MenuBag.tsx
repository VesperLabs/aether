import { Flex, Text, Icon } from "@aether/ui";
import { Menu, useAppContext, Slot, MenuHeader, MENU_MAX_WIDTH } from "./";

const GoldDisplay = ({ gold }) => (
  <Flex sx={{ flex: 1, gap: 1, justifyContent: "end", alignItems: "center", pr: 2 }}>
    <Icon icon="../assets/icons/gold.png" size={16} />
    <Text>{gold || 0}</Text>
  </Flex>
);

const MenuBag = ({ id }) => {
  const { hero, toggleBagState } = useAppContext();
  const bag = hero?.inventory?.find((item: Item) => item?.id === id);
  const maxInventory = new Array(bag?.space).fill(null);

  return (
    <Menu>
      <Flex sx={{ flexWrap: "wrap", justifyContent: "end", gap: 2, flex: 1 }}>
        <MenuHeader
          icon={`../assets/atlas/bag/${bag?.texture}.png`}
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
              icon={`../assets/atlas/bag/${bag?.texture}.png`}
              item={bag?.items?.[idx]}
            />
          ))}
        </Flex>
      </Flex>
    </Menu>
  );
};

export default MenuBag;
