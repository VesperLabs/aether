import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Box, Button, Flex, PadCombo, Portal } from "@/ui";
import { CONTROL_GOLD } from "@/ui/kit/modal-gilding";
import { MODAL_ATTR } from "@/ui/kit/shake-modal";
import { getLastDevice, subscribeLastDevice } from "@/client/input/last-device";
import {
  PAD_POPUP_ATTR,
  PAD_KEYBOARD_ATTR,
  PAD_KEYBOARD_EVENT,
  isPadFieldChosen,
  leaveTyping,
  type PadKeyboardAction,
} from "@/client/input/pad-keyboard-events";
import { backspace, isTextField, pressEnter, typeInto, type TextField } from "./text-entry";

const ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", "@"],
  ["shift", "z", "x", "c", "v", "b", "n", "m", ".", "back"],
  ["/", "-", "_", "space", "?", "!"],
];

/* Over the keys: put the keyboard away, or finish */
const FOOTER = [
  { key: "hide", label: "Hide", button: 8 },
  { key: "done", label: "Done", button: 9 },
];

const LABELS: Record<string, string> = { shift: "⇧", back: "⌫", space: "Space" };
/* The controller buttons that press these keys without moving to them (`gamepad-menus`) */
const SHORTCUTS: Record<string, number> = { back: 1, shift: 2, space: 3 };
const WIDE: Record<string, number> = { space: 5 };
const KEY = 36;
/* Highlighted, a key's corner shows A (the menu badge) instead of its shortcut */
/* A modal tab's face: its fill, a dark edge, and the light catching its top */
const KEY_FACE = {
  bg: "shadow.25",
  border: "1px solid #000",
  borderRadius: 4,
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.15)",
  fontFamily: "inherit",
} as const;

/* Where the key badges sit on every button: on the bottom-right corner, just past it */
const SHORTCUT_CORNER = { position: "absolute", right: "-3px", bottom: "-3px" } as const;
/*
 * Every key draws A in its corner while highlighted, in place of its shortcut, from the same
 * spot the shortcut uses: the menu badge stays off the keyboard (`PadNavBadge`).
 */
const A_ON_FOCUS = {
  "& > .pad-a": { display: "none" },
  "&[data-pad-focus] > .pad-a": { display: "flex" },
  "&[data-pad-focus] > .pad-own": { display: "none" },
};
const GAP = 3;
/** Space between the keyboard and the screen's bottom. */
const EDGE = 16;
/** Space between the keyboard and the field or list it sits by: the gap chat's list keeps. */
const LIST_GAP = 8;

/* The list a field last handed over to, so it isn't handed over again when typing resumes */
let handedTo: Element | null = null;

/** The text field that has focus, kept current as focus moves. */
function useFocusedField() {
  const [field, setField] = useState<TextField | null>(() => {
    const active = document.activeElement;
    return isTextField(active) ? active : null;
  });
  useEffect(() => {
    const update = () => {
      const active = document.activeElement;
      setField(isTextField(active) ? active : null);
    };
    /* After focus has moved on, so a field handing focus to another doesn't flicker it shut */
    const later = () => requestAnimationFrame(update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", later);
    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", later);
    };
  }, []);
  return field;
}

/**
 * A keyboard to type with a controller: it opens under any text field that has focus while the
 * controller is in use. The menu highlight moves over its keys and A presses them; B deletes
 * (or, on an empty field, puts it away), Y is space, X is shift, Start is Done and Select or
 * the Hide key puts it away. Done sends a chat message, but in a modal only puts it away.
 */
export const PadKeyboard = () => {
  const device = useSyncExternalStore(subscribeLastDevice, getLastDevice);
  const field = useFocusedField();
  const [shift, setShift] = useState(false);
  const open = device === "gamepad" && !!field && isPadFieldChosen(field);
  const panel = useRef<HTMLDivElement>(null);

  /* Clear of the field being typed in: above it when it's low on screen (chat, in the bottom
   * menu), else at the bottom, below it (login, rename). Followed as the field moves */
  useEffect(() => {
    if (!open || !field) return;
    let frame = requestAnimationFrame(function follow() {
      frame = requestAnimationFrame(follow);
      const el = panel.current;
      if (el) {
        /* A list opening from what's typed (chat's commands, on "/") takes over: the keys
         * step aside so the highlight goes to it. Only as it opens, not when typing resumes */
        const list = document.querySelector(`[${PAD_POPUP_ATTR}]`);
        if (list && list !== handedTo) {
          handedTo = list;
          leaveTyping(field);
          field.blur();
          return;
        }
        if (!list) handedTo = null;
        const top = field.getBoundingClientRect().top;
        const low = top > window.innerHeight / 2;
        /* Beside a list opened from what's typed (chat's commands), its bottom level with the
         * list's, so the two sit side by side over the box instead of one over the other */
        const beside = list?.getBoundingClientRect();
        if (beside) {
          el.style.bottom = `${window.innerHeight - beside.bottom}px`;
          el.style.left = `${beside.right + LIST_GAP}px`;
          el.style.transform = "none";
        } else {
          /* The same gap over the box that the list keeps */
          el.style.bottom = `${low ? window.innerHeight - top + LIST_GAP : EDGE}px`;
          el.style.left = "50%";
          el.style.transform = "translateX(-50%)";
        }
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open, field]);

  const press = (key: string) => {
    if (!field) return;
    if (key === "shift") return setShift((on) => !on);
    if (key === "hide") return field.blur();
    /* Backing out of an empty field puts the keyboard away, as on a console */
    if (key === "back") return field.value ? backspace(field) : field.blur();
    if (key === "done") {
      /* In a modal Done only puts the keyboard away, and Start confirms the modal (login,
       * rename). Chat has no confirm button, so there Done sends, as Enter does */
      if (!field.closest(`[${MODAL_ATTR}]`)) pressEnter(field);
      return field.blur();
    }
    typeInto(field, key === "space" ? " " : shift ? key.toUpperCase() : key);
    setShift(false);
  };

  /* The controller's own shortcuts while the keyboard is up */
  useEffect(() => {
    if (!open || !field) return;
    const onAction = (e: Event) => {
      const action = (e as CustomEvent<PadKeyboardAction>).detail;
      press(action === "close" ? "hide" : action);
    };
    window.addEventListener(PAD_KEYBOARD_EVENT, onAction);
    return () => window.removeEventListener(PAD_KEYBOARD_EVENT, onAction);
  });

  if (!open) return null;
  return (
    /* On the body: under the HUD's scaled boxes, fixed would be relative to them */
    <Portal container={document.body}>
      <Flex
        ref={panel}
        {...{ [PAD_KEYBOARD_ATTR]: true }}
        variant="buttons.wood"
        sx={{
          position: "fixed",
          left: "50%",
          bottom: EDGE,
          transform: "translateX(-50%)",
          zIndex: "tooltip",
          flexDirection: "column",
          gap: `${GAP}px`,
          p: 2,
          borderRadius: 3,
          pointerEvents: "all",
        }}
        /* Keys never take focus from the field they type into */
        onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
      >
        <Flex sx={{ gap: 2, mb: 1 }}>
          {FOOTER.map(({ key, label, button }) => (
            <Button
              key={key}
              variant="wood"
              onClick={() => press(key)}
              sx={{
                flex: 1,
                position: "relative",
                justifyContent: "center",
                ...A_ON_FOCUS,
              }}
            >
              {label}
              <PadCombo className="pad-own" pad={{ button }} sx={SHORTCUT_CORNER} />
              <PadCombo className="pad-a" pad={{ button: 0 }} sx={SHORTCUT_CORNER} />
            </Button>
          ))}
        </Flex>
        {ROWS.map((row) => (
          <Flex key={row.join("")} sx={{ gap: `${GAP}px`, justifyContent: "center" }}>
            {row.map((key) => (
              <Box
                key={key}
                as="button"
                onClick={() => press(key)}
                sx={{
                  width: KEY * (WIDE[key] ?? 1) + GAP * ((WIDE[key] ?? 1) - 1),
                  height: KEY,
                  p: 0,
                  position: "relative",
                  fontSize: 1,
                  lineHeight: 1,
                  textAlign: "center",
                  cursor: "pointer",
                  /* Raised like the modal tabs, not sunk like a text field */
                  ...KEY_FACE,
                  color: key === "shift" && shift ? CONTROL_GOLD : "text",
                  ...A_ON_FOCUS,
                }}
              >
                {LABELS[key] ?? (shift ? key.toUpperCase() : key)}
                <PadCombo className="pad-a" pad={{ button: 0 }} sx={SHORTCUT_CORNER} />
                {key in SHORTCUTS && (
                  /* Where the key badges sit on the HUD's buttons */
                  <PadCombo
                    className="pad-own"
                    pad={{ button: SHORTCUTS[key] }}
                    sx={SHORTCUT_CORNER}
                  />
                )}
              </Box>
            ))}
          </Flex>
        ))}
      </Flex>
    </Portal>
  );
};
