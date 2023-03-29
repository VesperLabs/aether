import React from "react";
import { isMobile } from "../utils";
import { Button, KeyboardKey } from "./";

const KeeperButton = ({ keyboardKey, onClick, children, active, ...props }) => {
  return (
    <Button
      sx={{
        display: "flex",
        gap: 2,
        alignItems: "end",
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
