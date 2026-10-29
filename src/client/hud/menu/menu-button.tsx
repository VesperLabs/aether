import React from "react";
import { Icon, KeyboardKey, Button, NotificationBadge } from "@/ui";
import { isMobile } from "@/ui";

interface MenuButtonProps {
  keyboardKey?: string;
  onClick?: () => void;
  iconName?: string;
  isActive?: boolean;
  children?: React.ReactNode;
  sx?: Record<string, unknown>;
  size?: number;
  disabled?: boolean;
  id?: string;
  /** Shows a small counter in the top-right corner when above 0. */
  badge?: number;
}

export const MenuButton = ({
  keyboardKey,
  onClick = () => {},
  iconName,
  isActive,
  children,
  sx,
  size = 38,
  disabled = false,
  id,
  badge,
}: MenuButtonProps) => {
  return (
    <Button
      id={id}
      disabled={disabled}
      variant="menu"
      className={isActive ? "active" : ""}
      onClick={onClick}
      sx={{ position: "relative", flexShrink: 0, ...sx }}
    >
      {iconName && <Icon size={size} icon={`./assets/icons/${iconName}.png`} />}
      {children}
      <NotificationBadge count={badge} />
      {!isMobile && keyboardKey && (
        <KeyboardKey
          sx={{ bottom: "-3px", right: "-3px" }}
          name={keyboardKey}
          onKeyUp={onClick}
          disabled={disabled}
        />
      )}
    </Button>
  );
};
