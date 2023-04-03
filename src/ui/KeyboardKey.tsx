import React, { useEffect, useState } from "react";
import { Box } from "./";

interface KeyboardKeyProps {
  name: string;
  onKeyUp?: (e: KeyboardEvent) => void;
  hidden?: boolean;
  showOnly?: boolean;
  onKeyDown?: (e: KeyboardEvent) => void;
  sx?: object;
}

const getKeyName = (name: string) => {
  let keyName = name.toUpperCase();
  if (name === "ESCAPE") {
    keyName = "ESC";
  }
  if (name === " ") {
    keyName = "SPACE";
  }
  return keyName.toUpperCase();
};

const KeyboardKey: React.FC<KeyboardKeyProps> = ({
  name,
  onKeyUp,
  hidden,
  showOnly,
  onKeyDown,
  sx,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const keyDisplayName = getKeyName(name);

  const handleKeyUp = (e: KeyboardEvent) => {
    const keyName = getKeyName(e?.key || "");
    if (
      // @ts-ignore
      (document.activeElement?.type === "text" || e.target?.type === "text") &&
      keyName !== "ESCAPE"
    ) {
      return;
    }

    if (keyName === name) {
      if (!showOnly) onKeyUp?.(e);
      setIsPressed(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const keyName = getKeyName(e?.key || "");
    // @ts-ignore
    if (document.activeElement?.type === "text" || e.target?.type === "text") {
      return;
    }

    if (keyName === name) {
      if (!showOnly) onKeyDown?.(e);
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
      {keyDisplayName}
    </Box>
  );
};

export default KeyboardKey;
