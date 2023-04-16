import { Flex, MenuHeader, useAppContext, Slot } from "./";

const MenuAbilities = () => {
  const { hero, tabAbilities, setTabAbilities } = useAppContext();
  const abilities = Object.entries(hero?.abilities || {});

  return (
    <Flex
      sx={{
        gap: 2,
        p: 2,
        flexWrap: "wrap",
        justifyContent: "end",
        bg: "shadow.30",
        pointerEvents: "all",
        display: tabAbilities ? "flex" : "none",
        "&:hover": {
          zIndex: 999,
        },
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
    </Flex>
  );
};

export default MenuAbilities;
