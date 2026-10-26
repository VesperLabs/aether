import React from "react";
import { Flex, Box, Text } from "theme-ui";
import { KeyboardKey } from "./keyboard-key";
import { Icon } from "./icon";
import { isMobile } from "@/ui/is-mobile";

export const MENU_MAX_WIDTH = 1024;

export const Menu = (p: any) => {
  const { sx = {}, ...props } = p;
  return (
    <Flex
      // @ts-ignore
      __themeKey="menus"
      sx={{
        p: 2,
        gap: 2,
        flexWrap: "wrap",
        flexDirection: "column",
        justifyContent: "end",
        alignItems: "end",
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

interface MenuHeaderProps {
  children?: React.ReactNode;
  onClick?: () => void;
  icon?: string;
  sx?: any;
}

export const MenuHeader = ({ icon, children, onClick = () => {}, sx }: MenuHeaderProps) => {
  return (
    <Flex
      sx={{
        width: "100%",
        justifyContent: "end",
        position: "relative",
        maxWidth: MENU_MAX_WIDTH,
        gap: 1,
        p: 2,
        py: 1,
        alignItems: "center",
        background: "shadow.30",
        borderRadius: 6,
        ...sx,
      }}
    >
      {isMobile ? (
        <Box onClick={() => onClick()} sx={{ pointerEvents: "all" }}>
          ❌
        </Box>
      ) : (
        <Box>
          <KeyboardKey
            showOnly={true}
            name={"ESCAPE"}
            onKeyUp={onClick}
            sx={{ position: "relative" }}
          />
        </Box>
      )}
      <Box sx={{ flex: 1 }} />
      <Text sx={{ display: "flex", gap: 2 }}>{children}</Text>
      {icon && <Icon size={22} icon={icon} />}
    </Flex>
  );
};
