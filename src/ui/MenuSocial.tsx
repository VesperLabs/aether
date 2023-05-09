import { Flex, Menu, useAppContext, MenuHeader } from "./";

const MenuSocial = () => {
  const { hero, tabSocial, setTabSocial } = useAppContext();

  return (
    <Menu
      sx={{
        display: tabSocial ? "flex" : "none",
      }}
    >
      <Flex sx={{ flexWrap: "wrap", justifyContent: "end", gap: 2, flex: 1 }}>
        <MenuHeader icon="social" onClick={() => setTabSocial(false)}>
          Social
        </MenuHeader>
        <Flex
          sx={{
            display: tabSocial ? "flex" : "none",
            gap: 2,
            flexWrap: "wrap",
            justifyContent: "end",
            maxWidth: 592,
          }}
        ></Flex>
      </Flex>
    </Menu>
  );
};

export default MenuSocial;
