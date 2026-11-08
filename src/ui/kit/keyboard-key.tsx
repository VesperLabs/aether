import React, { useEffect, useEffectEvent, useLayoutEffect, useState, useRef } from "react";
import { MODAL_ATTR } from "./shake-modal";
import type { ThemeUIStyleObject } from "theme-ui";
import { Box, Flex } from "theme-ui";
import { PAD_KEY_ATTR, PAD_KEY_SWAP, PadCombo, usePadHint } from "./pad-glyph";

interface KeyboardKeyProps {
  name: string;
  onKeyUp?: () => void;
  hidden?: boolean;
  showOnly?: boolean;
  onKeyDown?: (e: KeyboardEvent) => void;
  disabled?: boolean;
  sx?: ThemeUIStyleObject;
}

/**
 * Set on a key event meant only for the open modal's buttons, such as a controller confirming it:
 * shortcuts elsewhere on the page (chat's Enter) ignore it.
 */
export const MODAL_ONLY_KEY = "modalOnly";

const isModalOnly = (e: KeyboardEvent) => MODAL_ONLY_KEY in e;

const IGNORE_PRESS_ELEMENT_TYPES = ["text", "number", "textarea"];

/** The `type` of an input element, if the target is one. */
function inputType(target: EventTarget | Element | null) {
  return (target as HTMLInputElement | null)?.type;
}

/** True if the last Enter keydown started in an input/textarea (survives keyup after unmount). */
let enterKeydownFromEditableField = false;

function isEditableFieldTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.tagName === "TEXTAREA") return true;
  const type = (target as HTMLInputElement).type;
  return IGNORE_PRESS_ELEMENT_TYPES.includes(type);
}

function onEnterKeyDownCapture(e: KeyboardEvent) {
  if (e.key !== "Enter") return;
  enterKeydownFromEditableField = isEditableFieldTarget(e.target);
}

if (typeof window !== "undefined") {
  window.addEventListener("keydown", onEnterKeyDownCapture, true);
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

/**
 * The key an event names, as `KeyboardKey` names it. Digits go by the physical key, since Shift
 * turns "1" into "!": a digit let go while Shift is held would otherwise never release its ability.
 */
export function getEventKeyName(e: Pick<KeyboardEvent, "key" | "code">) {
  const digit = /^Digit(\d)$/.exec(e.code ?? "")?.[1];
  return digit ?? getKeyName(e.key || "");
}

const KEY_LABELS: Record<string, string> = {
  ENTER: "↵",
  ARROWUP: "↑",
  ARROWDOWN: "↓",
  ARROWLEFT: "←",
  ARROWRIGHT: "→",
  CONTROL: "CTRL",
  BACKSPACE: "⌫",
};

/** Short label for the key badge (logical name still matches via getKeyName). */
export const getKeyDisplayLabel = (name: string) => {
  const keyName = getKeyName(name);
  return KEY_LABELS[keyName] ?? keyName;
};

export const KeyboardKey: React.FC<KeyboardKeyProps> = ({
  name,
  onKeyUp,
  hidden,
  showOnly,
  onKeyDown,
  disabled,
  sx,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isPressed, setIsPressed] = useState(false);

  const keyDisplayName = getKeyDisplayLabel(name);
  /* With a controller in hand, its button instead, or nothing when the key has none */
  const padHint = usePadHint();
  /* A modal's confirm and back buttons are only its own: chat's Enter outside it stays Enter */
  const [inModal, setInModal] = useState(false);
  useLayoutEffect(() => setInModal(!!ref.current?.closest(`[${MODAL_ATTR}]`)), []);
  const pad = padHint?.(name, inModal);

  const handleKeyUp = useEffectEvent((e: KeyboardEvent) => {
    if (isModalOnly(e) && !inModal) return;
    const keyName = getEventKeyName(e);
    /* Enter: chat submit unmounts input before keyup; don't treat that keyup as HUD Enter.
     * Every KeyboardKey sees this keyup, so the flag isn't cleared here (the first one to see it
     * would clear it for the rest and the Enter key would reopen chat). The next Enter keydown resets it. */
    if (keyName === "ENTER" && enterKeydownFromEditableField) {
      if (name === "ENTER") setIsPressed(false);
      return;
    }
    /* Don't fire HUD shortcuts while typing in inputs; ESC still works (e.g. close modals). */
    if (
      IGNORE_PRESS_ELEMENT_TYPES.some((t) =>
        [inputType(document.activeElement), inputType(e.target)].includes(t),
      ) &&
      keyName !== "ESCAPE"
    ) {
      return false;
    }

    if (keyName === name) {
      if (!showOnly && !disabled) ref?.current?.click();
      setIsPressed(false);
    }
  });

  const handleKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.repeat || (isModalOnly(e) && !inModal)) return;
    const keyName = getEventKeyName(e);
    if (inputType(document.activeElement) === "text" || inputType(e.target) === "text") {
      return;
    }

    if (keyName === name) {
      if (!showOnly) onKeyDown?.(e);
      setIsPressed(true);
    }
  });

  useEffect(() => {
    const onKeyUp = (e: KeyboardEvent) => handleKeyUp(e);
    const onKeyDown = (e: KeyboardEvent) => handleKeyDown(e);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <Flex
      ref={ref}
      className={isPressed ? "pressed" : ""}
      {...(pad && !hidden && { [PAD_KEY_ATTR]: true })}
      onClick={(e) => {
        e.stopPropagation();
        onKeyUp?.();
      }}
      sx={{
        cursor: "pointer",
        display: hidden || (padHint && !pad) ? "none" : "block",
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
        /* The glyphs draw their own shape */
        ...(pad && { bg: "transparent", boxShadow: "none", p: 0, minWidth: 0, ...PAD_KEY_SWAP }),
      }}
    >
      {pad ? (
        <>
          <PadCombo className="pad-own" pad={pad} sx={{ opacity: isPressed ? 0.7 : 1 }} />
          <PadCombo className="pad-a" pad={{ button: 0 }} />
        </>
      ) : (
        <Box sx={{ lineHeight: 1, fontSize: "10px", fontWeight: "bold", textShadow: "none" }}>
          {keyDisplayName}
        </Box>
      )}
    </Flex>
  );
};
