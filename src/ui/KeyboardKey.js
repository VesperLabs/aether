import React, { useEffect, useState } from "react";
import { Box } from "./";

const getKeyName = (name) => {
  let keyName = name.toUpperCase();
  if (name === "ESCAPE") {
    keyName = "ESC";
  }
  if (name === " ") {
    keyName = "SPACE";
  }
  return keyName.toUpperCase();
};

const KeyboardKey = ({ name, onKeyUp, hidden, onKeyDown, sx }) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleKeyUp = (e) => {
    if (document.activeElement.type === "text") return;
    const keyName = getKeyName(e?.key);
    if (keyName === name) {
      onKeyUp?.();
      setIsPressed(false);
    }
  };

  const handleKeyDown = (e) => {
    if (document.activeElement.type === "text") return;
    const keyName = getKeyName(e?.key);
    if (keyName === name) {
      onKeyDown?.();
      setIsPressed(true);
    }
  };

  useEffect(() => {
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <Box
      sx={{
        display: hidden ? "none" : "block",
        position: "absolute",
        bottom: 0,
        right: 0,
        bg: "#EEE",
        px: "5px",
        pb: isPressed ? "3px" : "4px",
        minWidth: 16,
        textAlign: "center",
        lineHeight: 1,
        borderRadius: 3,
        textShadow: "none",
        color: "#000",
        fontSize: "10px",
        fontWeight: "bold",
        boxShadow: `#CCCCCC 0px ${isPressed ? -1 : -2}px 0px ${isPressed ? 1 : 2}px inset,
                     #000000 0px 0px 0px 1px,
                     #ffffff 0px -1px 0px ${isPressed ? 1 : 2}px inset`,
        ...sx,
      }}
    >
      {name}
    </Box>
  );
};

export default KeyboardKey;