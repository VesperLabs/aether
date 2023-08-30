import { Flex, KeyboardKey, Text, Icon, Box } from "@aether/ui";
import { MENU_MAX_WIDTH } from "./";
import { isMobile } from "@aether/shared";
import React from "react";

interface MenuHeaderProps {
  children?: React.ReactNode;
  onClick?: () => void;
  icon?: string;
  sx?: any;
}

const MenuHeader = ({ icon, children, onClick = () => {}, sx }: MenuHeaderProps) => {
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
        <Box onTouchEnd={() => onClick()} sx={{ pointerEvents: "all" }}>
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

export default MenuHeader;
