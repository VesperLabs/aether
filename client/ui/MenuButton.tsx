import React from "react";
import { Icon, KeyboardKey, Button } from "@aether/ui";
import { isMobile } from "@aether/shared";

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
      {iconName && <Icon size={size} icon={`./assets/icons/${iconName}.png`} />}
      {children}
      {!isMobile && keyboardKey && (
        <KeyboardKey sx={{ bottom: "-3px", right: "-3px" }} name={keyboardKey} onKeyUp={onClick} />
      )}
    </Button>
  );
};

export default MenuButton;
