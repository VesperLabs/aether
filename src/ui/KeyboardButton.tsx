import React, { FC } from "react";
import { isMobile } from "../utils";
import { Button, KeyboardKey, Box } from "./";

interface KeyboardButtonProps {
  keyboardKey: string;
  onClick?: () => void;
  active?: boolean;
  children?: React.ReactNode;
  showOnly?: boolean;
  variant?: "wood" | "header";
  sx?: object;
}

const KeeperButton: FC<KeyboardButtonProps> = ({
  keyboardKey,
  onClick,
  children,
  active,
  showOnly,
  variant = "wood",
  sx,
  ...props
}) => {
  return (
    <Button
      sx={{
        gap: 1,
        justifyContent: "center",
        ...sx,
      }}
      variant={variant}
      onClick={onClick}
      {...props}
    >
      {children}
      {!isMobile && (
        <Box sx={{ alignSelf: "end" }}>
          <KeyboardKey
            showOnly={showOnly}
            sx={{ position: "static", mr: "-2px" }}
            name={keyboardKey}
            onKeyUp={onClick}
          />
        </Box>
      )}
    </Button>
  );
};

export default KeeperButton;
