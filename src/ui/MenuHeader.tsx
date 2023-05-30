import { Flex, KeyboardButton, Text, Icon, Box } from "./";
import { isMobile } from "../utils";
import React from "react";

interface MenuHeaderProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: string;
  sx?: any;
}

const MenuHeader = ({ icon, children, onClick = () => {}, sx }: MenuHeaderProps) => {
  return (
    <Flex sx={{ width: "100%", justifyContent: "end", ...sx }}>
      <KeyboardButton
        variant={"header"}
        showOnly={true}
        keyboardKey="ESCAPE"
        sx={{ cursor: "default" }}
        onClick={onClick}
      >
        {icon && <Icon size={22} icon={icon} />}
        <Text sx={{ display: "flex", flex: 1, gap: 4 }}>{children}</Text>
        {isMobile && (
          <Box onTouchEnd={() => onClick()} sx={{ pointerEvents: "all" }}>
            ❌
          </Box>
        )}
      </KeyboardButton>
    </Flex>
  );
};

export default MenuHeader;
