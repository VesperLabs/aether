import React, { FC } from "react";
import { isMobile } from "@aether/shared";
import { Button, KeyboardKey, Box } from "./";

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

const KeeperButton: FC<KeyboardButtonProps> = ({
  keyboardKey,
  onClick,
  children,
  active,
  showOnly,
  variant = "wood",
  sx,
  disabled,
  ...props
}) => {
  return (
    <Button
      sx={{
        gap: 1,
        justifyContent: "center",
        alignItems: "center",
        ...sx,
      }}
      variant={variant}
      onClick={!showOnly && onClick}
      disabled={disabled}
      {...props}
    >
      {children}
      {!isMobile && (
        <Box sx={{ alignSelf: "end" }}>
          <KeyboardKey
            showOnly={showOnly}
            sx={{ position: "static", mr: "-2px" }}
            name={keyboardKey}
            onKeyUp={!disabled ? onClick : () => {}}
          />
        </Box>
      )}
    </Button>
  );
};

export default KeeperButton;
