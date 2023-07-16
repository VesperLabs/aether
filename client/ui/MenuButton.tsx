import React from "react";
import { Icon, KeyboardKey, Button } from "@aether/ui";
import { isMobile } from "../utils";

interface MenuButtonProps {
  keyboardKey?: string;
  onClick?: () => void;
  iconName?: string;
  isActive?: boolean;
  children?: React.ReactNode;
  sx?: Record<string, unknown>;
  size?: number;
  disabled?: boolean;
}

const MenuButton = ({
  keyboardKey,
  onClick = () => {},
  iconName,
  isActive,
  children,
  sx,
  size = 38,
  disabled = false,
}: MenuButtonProps) => {
  return (
    <Button
      disabled={disabled}
      variant="menu"
      className={isActive ? "active" : ""}
      onClick={onClick}
      sx={{ position: "relative", flexShrink: 0, ...sx }}
    >
      <Icon size={size} icon={`../assets/icons/${iconName || "grab"}.png`} />
      {children}
      {!isMobile && keyboardKey && (
        <KeyboardKey sx={{ bottom: "-3px", right: "-3px" }} name={keyboardKey} onKeyUp={onClick} />
      )}
    </Button>
  );
};

export default MenuButton;
