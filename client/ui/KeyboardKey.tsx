import React, { useEffect, useState, useRef } from "react";
import { Box, Flex } from "./";

interface KeyboardKeyProps {
  name: string;
  onKeyUp?: any;
  hidden?: boolean;
  showOnly?: boolean;
  onKeyDown?: any;
  disabled?: boolean;
  sx?: object;
}

const IGNORE_PRESS_ELEMENT_TYPES = ["text", "number"];

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
  disabled,
  sx,
}) => {
  const ref = useRef(null);
  const [isPressed, setIsPressed] = useState(false);

  const keyDisplayName = getKeyName(name);

  const handleKeyUp = (e: KeyboardEvent) => {
    const keyName = getKeyName(e?.key || "");
    if (
      // @ts-ignore
      IGNORE_PRESS_ELEMENT_TYPES.some((t) =>
        // @ts-ignore
        [document.activeElement?.type, e.target?.type].includes(t)
      ) &&
      keyName !== "ESCAPE" &&
      keyName !== "ENTER"
    ) {
      return false;
    }

    if (keyName === name) {
      if (!showOnly && !disabled) ref?.current?.click();
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
    <Flex
      ref={ref}
      className={isPressed ? "pressed" : ""}
      onClick={(e) => {
        e.stopPropagation();
        onKeyUp?.();
      }}
      sx={{
        cursor: "pointer",
        display: hidden ? "none" : "block",
        position: "absolute",
        bottom: 0,
        right: 0,
        pt: 0,
        bg: "#EEE",
        px: "5px",
        pb: isPressed ? "3px" : "4px",
        minWidth: 16,
        textAlign: "center",
        borderRadius: 3,
        flexShrink: 0,
        color: "#000",
        boxShadow: `#CCCCCC 0px ${isPressed ? -1 : -2}px 0px ${isPressed ? 1 : 2}px inset,
                     #000000 0px 0px 0px 1px,
                     #ffffff 0px -1px 0px ${isPressed ? 1 : 2}px inset`,
        ...sx,
      }}
    >
      <Box sx={{ lineHeight: 1, fontSize: "10px", fontWeight: "bold", textShadow: "none" }}>
        {keyDisplayName}
      </Box>
    </Flex>
  );
};

export default KeyboardKey;
