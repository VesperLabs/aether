import React, { FC } from "react";
import { isMobile } from "./is-mobile";
import { Button } from "./button/button";
import { KeyboardKey } from "./keyboard-key";

interface KeyboardButtonProps {
  keyboardKey: string;
  onClick?: () => void;
  active?: boolean;
  children?: React.ReactNode;
  showOnly?: boolean;
  variant?: "wood" | "header";
  sx?: object;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export const KeyboardButton: FC<KeyboardButtonProps> = ({
  keyboardKey,
  onClick,
  children,
  active: _active,
  showOnly,
  variant = "wood",
  sx,
  disabled,
  ...props
}) => {
  return (
    <Button
      sx={{
        position: "relative",
        gap: 1,
        justifyContent: "center",
        alignItems: "center",
        ...sx,
      }}
      variant={variant}
      onClick={!showOnly ? onClick : undefined}
      disabled={disabled}
      {...props}
    >
      {children}
      {/* On the bottom-right corner, as on every button with a key */}
      {!isMobile && (
        <KeyboardKey
          showOnly={showOnly}
          sx={{ bottom: "-3px", right: "-3px", pointerEvents: "none" }}
          name={keyboardKey}
          onKeyUp={!disabled ? onClick : () => {}}
        />
      )}
    </Button>
  );
};
