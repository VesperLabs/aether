import React from "react";
import { isMobile } from "../utils";
import { Button, KeyboardKey } from "./";

const KeeperButton = ({ keyboardKey, onClick, children, active, sx, ...props }) => {
  return (
    <Button
      sx={{
        gap: 1,
        justifyContent: "center",
        ...sx,
      }}
      variant="wood"
      onClick={onClick}
      {...props}
    >
      {children}
      {!isMobile && (
        <KeyboardKey
          sx={{ position: "static", mr: "-2px" }}
          name={keyboardKey}
          onKeyUp={onClick}
          stopPropagation={true}
        />
      )}
    </Button>
  );
};

export default KeeperButton;
