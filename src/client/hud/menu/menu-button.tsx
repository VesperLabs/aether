import React, { useEffect, useEffectEvent, useRef } from "react";
import { Icon, KeyboardKey, Button, NotificationBadge } from "@/ui";
import { isMobile, SPRING_OPEN_ATTR, SPRING_OPEN_EVENT } from "@/ui";

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
  /** Opens when a dragged item rests on it for a moment. */
  springOpen?: boolean;
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
  springOpen = false,
}: MenuButtonProps) => {
  const ref = useRef<HTMLButtonElement>(null);
  const onSpringOpen = useEffectEvent(() => onClick());
  useEffect(() => {
    const button = ref.current;
    if (!springOpen || !button) return;
    const handle = () => onSpringOpen();
    button.addEventListener(SPRING_OPEN_EVENT, handle);
    return () => button.removeEventListener(SPRING_OPEN_EVENT, handle);
  }, [springOpen]);

  return (
    <Button
      ref={ref}
      id={id}
      {...(springOpen && !isActive && { [SPRING_OPEN_ATTR]: true })}
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
