import React, { useEffect, useState } from "react";
import { Box } from "./";

const getKeyName = (name: string) => {
  if (name === "Escape") return "ESC";
  if (name === " ") return "SPACE";
  return name.toUpperCase();
};

type KeyboardKeyProps = {
  name: string;
  onKeyUp?: (e: Event) => void;
  hidden?: boolean;
  onKeyDown?: () => void;
  sx?: object;
};

const KeyboardKey = ({ name, onKeyUp, hidden = false, onKeyDown, sx = {} }: KeyboardKeyProps) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleKeyUp = (e: KeyboardEvent) => {
    const keyName = getKeyName(e?.key);
    if (
      (document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement) &&
      keyName !== "ESCAPE"
    )
      return;

    if (keyName === name) {
      onKeyUp?.(e as Event);
      setIsPressed(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const keyName = getKeyName(e?.key);
    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement
    )
      return;

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
        transition: "all 0.01s ease-in-out",
        boxShadow: `#CCCCCC 0px ${isPressed ? -1 : -2}px 0px ${isPressed ? 1 : 2}px inset,
                     #000000 0px 0px 0px 1px,
                     #ffffff 0px -1px 0px ${isPressed ? 1 : 2}px inset`,
        ...sx,
      }}
    >
      {getKeyName(name)}
    </Box>
  );
};

export default KeyboardKey;
