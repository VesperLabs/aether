import React from "react";
import { isMobile } from "../utils";
import { Button, KeyboardKey, Box } from "./";

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
        <Box sx={{ alignSelf: "end" }}>
          <KeyboardKey
            sx={{ position: "static", mr: "-2px" }}
            name={keyboardKey}
            onKeyUp={onClick}
            stopPropagation={true}
          />
        </Box>
      )}
    </Button>
  );
};

export default KeeperButton;
