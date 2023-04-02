import React from "react";
import { Icon, KeyboardKey, Button } from "./";
import { isMobile } from "../utils";

interface MenuButtonProps {
  keyboardKey?: string;
  onClick?: () => void;
  iconName?: string;
  isActive?: boolean;
  children?: React.ReactNode;
  sx?: Record<string, unknown>;
}

const MenuButton = ({
  keyboardKey,
  onClick = () => {},
  iconName,
  isActive,
  children,
  sx,
}: MenuButtonProps) => {
  return (
    <Button
      variant="menu"
      className={isActive ? "active" : ""}
      onClick={onClick}
      sx={{ position: "relative", flexShrink: 0, ...sx }}
    >
      <Icon icon={`../assets/icons/${iconName || "grab"}.png`} />
      {children}
      {!isMobile && keyboardKey && (
        <KeyboardKey sx={{ bottom: "-3px", right: "-3px" }} name={keyboardKey} onKeyUp={onClick} />
      )}
    </Button>
  );
};

export default MenuButton;
