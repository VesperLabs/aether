import { Flex, Menu, MenuHeader, useAppContext, Slot } from "./";

const MenuAbilities = () => {
  const { hero, tabAbilities, setTabAbilities } = useAppContext();
  const abilities = Object.entries(hero?.abilities || {});

  return (
    <Menu
      sx={{
        display: tabAbilities ? "flex" : "none",
      }}
    >
      <MenuHeader icon="book" onClick={() => setTabAbilities(false)}>
        Abilities
      </MenuHeader>
      <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", maxWidth: 592 }}>
        {abilities?.map(([slotKey, item]) => (
          <Slot
            key={slotKey}
            location="abilities"
            slotKey={slotKey}
            icon="./assets/icons/book.png"
            item={item}
          />
        ))}
      </Flex>
    </Menu>
  );
};

export default MenuAbilities;
