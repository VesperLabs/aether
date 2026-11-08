import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Box, Button, PadCombo, Flex, Select, Text, TextDivider } from "@/ui";
import { CONTROL_GOLD } from "@/ui/kit/modal-gilding";
import { CONTROL_TEXT } from "@/ui/kit/theme";
import { getEventKeyName, getKeyDisplayLabel } from "@/ui/kit/keyboard-key";
import {
  ACTION_GROUPS,
  RESERVED_BUTTONS,
  RESERVED_KEYS,
  bindButton,
  bindKey,
  resetBindings,
  type BindAction,
  type BindDevice,
} from "@/client/input/key-bindings";
import { getGamepad, pauseGamepadButtons, readPressed } from "@/client/input/gamepad";
import { useBindings } from "./use-key-bindings";

const DEVICES = [
  { value: "keyboard", label: "Keyboard" },
  { value: "gamepad", label: "Controller" },
];

interface Capture {
  action: BindAction;
  slot: 0 | 1;
}

/** Waits for the next key, which binds instead of reaching the game. Esc cancels, Backspace clears. */
function useKeyCapture(capture: Capture | null, done: () => void) {
  useEffect(() => {
    if (!capture) return;
    let swallowKeyUp = "";
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const key = getEventKeyName(e);
      swallowKeyUp = key;
      if (key === "ESCAPE") return done();
      if (key === "BACKSPACE" || key === "DELETE") {
        bindKey(capture.action, capture.slot, null);
        return done();
      }
      if (RESERVED_KEYS.includes(key)) return;
      bindKey(capture.action, capture.slot, key);
      done();
    };
    /* Swallow every keyup while waiting, then the one for the key that bound */
    const onKeyUp = (e: KeyboardEvent) => e.stopImmediatePropagation();
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      if (!swallowKeyUp) return;
      const onBoundKeyUp = (e: KeyboardEvent) => {
        if (getEventKeyName(e) !== swallowKeyUp) return;
        e.stopImmediatePropagation();
        window.removeEventListener("keyup", onBoundKeyUp, true);
      };
      window.addEventListener("keyup", onBoundKeyUp, true);
    };
  }, [capture, done]);
}

/** Waits for the next controller button. Keyboard Esc cancels. */
function useButtonCapture(action: BindAction | null, done: () => void) {
  useEffect(() => {
    if (!action) return;
    pauseGamepadButtons(true);
    /* Buttons already held when waiting began don't count until let go */
    const stale = new Set(
      readPressed()
        .map((isDown, i) => (isDown ? i : -1))
        .filter((i) => i >= 0),
    );
    /* Held in order: pressing a second makes a combo with the first, letting one go alone binds it */
    const held: number[] = [];
    let frame = requestAnimationFrame(function poll() {
      for (const [index, isDown] of readPressed().entries()) {
        if (stale.has(index)) {
          if (!isDown) stale.delete(index);
          continue;
        }
        /* Select and Start open menu mode, so they can't be bound */
        if (RESERVED_BUTTONS.includes(index)) continue;
        const isHeld = held.includes(index);
        if (isDown && !isHeld) {
          if (held.length) {
            bindButton(action, { hold: held[0], button: index });
            return done();
          }
          held.push(index);
        } else if (!isDown && isHeld) {
          bindButton(action, { button: index });
          return done();
        }
      }
      frame = requestAnimationFrame(poll);
    });
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const key = getEventKeyName(e);
      if (key === "BACKSPACE" || key === "DELETE") bindButton(action, null);
      if (key === "ESCAPE" || key === "BACKSPACE" || key === "DELETE") done();
    };
    const onKeyUp = (e: KeyboardEvent) => e.stopImmediatePropagation();
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      /* Let the button that bound go before the game sees it */
      requestAnimationFrame(function waitRelease() {
        if (readPressed().includes(true)) requestAnimationFrame(waitRelease);
        else pauseGamepadButtons(false);
      });
    };
  }, [action, done]);
}

/** The name of the connected controller, kept current as they are plugged in and out. */
function useGamepadName() {
  const [name, setName] = useState(() => getGamepad()?.id);
  useEffect(() => {
    const update = () => setName(getGamepad()?.id);
    window.addEventListener("gamepadconnected", update);
    window.addEventListener("gamepaddisconnected", update);
    return () => {
      window.removeEventListener("gamepadconnected", update);
      window.removeEventListener("gamepaddisconnected", update);
    };
  }, []);
  return name;
}

const BindSlot = ({
  label,
  waiting,
  onClick,
}: {
  label: ReactNode | undefined;
  waiting: boolean;
  onClick: () => void;
}) => (
  <Box
    as="button"
    onClick={onClick}
    variant="forms.input"
    sx={{
      width: 60,
      height: 22,
      p: 0,
      flexShrink: 0,
      ...CONTROL_TEXT,
      fontSize: 0,
      lineHeight: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      borderRadius: 4,
      /* Gold while it waits for a key, like a dropdown's chosen option; dim when unbound */
      color: waiting ? CONTROL_GOLD : "text",
      opacity: label || waiting ? 1 : 0.5,
    }}
  >
    {waiting ? "Press…" : (label ?? "—")}
  </Box>
);

/** Rebinds keyboard keys and controller buttons, one device at a time. */
export const KeyBindingsPanel = () => {
  const bindings = useBindings();
  const gamepadName = useGamepadName();
  /* Opens on whatever is plugged in, and follows a controller being plugged in or pulled */
  const [device, setDevice] = useState<BindDevice>(gamepadName ? "gamepad" : "keyboard");
  const [seenPad, setSeenPad] = useState(gamepadName);
  if (gamepadName !== seenPad) {
    setSeenPad(gamepadName);
    setDevice(gamepadName ? "gamepad" : "keyboard");
  }
  const [capture, setCapture] = useState<Capture | null>(null);
  const done = useCallback(() => setCapture(null), []);

  useKeyCapture(device === "keyboard" ? capture : null, done);
  useButtonCapture(device === "gamepad" ? (capture?.action ?? null) : null, done);

  const toggle = (next: Capture) =>
    setCapture((prev) => (prev?.action === next.action && prev.slot === next.slot ? null : next));

  const isWaiting = (action: BindAction, slot: 0 | 1) =>
    capture?.action === action && capture.slot === slot;

  return (
    <Flex sx={{ flexDirection: "column", gap: 2, fontSize: 1 }}>
      <Select
        label="Device"
        value={device}
        options={DEVICES}
        onChange={(value) => {
          setCapture(null);
          setDevice(value as BindDevice);
        }}
      />
      {device === "gamepad" && (
        <Text sx={{ fontSize: 0, opacity: 0.8, lineHeight: 1.3 }}>
          {gamepadName
            ? `Connected: ${gamepadName.replace(/\s*\(.*\)$/, "")}`
            : "No controller found. Press a button on it to connect."}
          {
            " Left stick moves, right aims. A talks, or grabs with no one near. Select or Start opens menus."
          }
        </Text>
      )}
      {ACTION_GROUPS.map((group) => (
        <Flex key={group.label} sx={{ flexDirection: "column", gap: 1 }}>
          <TextDivider>{group.label}</TextDivider>
          {group.actions.map(({ id, label }) => (
            <Flex key={id} sx={{ alignItems: "center", gap: 1, px: 2 }}>
              <Text sx={{ flex: 1, lineHeight: 1 }}>{label}</Text>
              {device === "keyboard" ? (
                ([0, 1] as const).map((slot) => {
                  const key = bindings.keyboard[id][slot];
                  return (
                    <BindSlot
                      key={slot}
                      label={key ? getKeyDisplayLabel(key) : undefined}
                      waiting={isWaiting(id, slot)}
                      onClick={() => toggle({ action: id, slot })}
                    />
                  );
                })
              ) : (
                <BindSlot
                  label={bindings.gamepad[id] ? <PadCombo pad={bindings.gamepad[id]} /> : undefined}
                  waiting={isWaiting(id, 0)}
                  onClick={() => toggle({ action: id, slot: 0 })}
                />
              )}
            </Flex>
          ))}
        </Flex>
      ))}
      <Text sx={{ fontSize: 0, opacity: 0.7, lineHeight: 1.3 }}>
        {device === "keyboard"
          ? "Click, then press a key. Esc cancels, ⌫ clears."
          : "Click, then press a button or hold one + press another."}
      </Text>
      <Button
        variant="wood"
        onClick={() => {
          setCapture(null);
          resetBindings(device);
        }}
      >
        Reset {device === "keyboard" ? "keys" : "buttons"}
      </Button>
    </Flex>
  );
};
