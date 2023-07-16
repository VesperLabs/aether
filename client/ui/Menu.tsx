import { Flex } from "@aether/ui";

const Menu = (p: any) => {
  const { sx = {}, ...props } = p;
  return (
    <Flex
      // @ts-ignore
      __themeKey="menus"
      sx={{
        p: 2,
        gap: 2,
        flexWrap: "wrap",
        justifyContent: "end",
        bg: "shadow.30",
        pointerEvents: "all",
        "&:hover": {
          zIndex: 999,
        },
        ...sx,
      }}
      {...props}
    />
  );
};

export default Menu;
