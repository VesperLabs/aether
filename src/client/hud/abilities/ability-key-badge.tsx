import { useSyncExternalStore } from "react";
import { Box, KeyboardKey, PadCombo } from "@/ui";
import { useBindings } from "@/client/hud/settings/use-key-bindings";
import { getLastDevice, subscribeLastDevice } from "@/client/input/last-device";
import type { BindAction } from "@/client/input/key-bindings";

/**
 * What an ability slot is bound to, on its corner in the abilities menu: bottom-right for a key,
 * top-right for a pad button, clear of the spell's level (top-left) and the highlight's A
 * (bottom-right) a controller draws. Dimmed, a label rather than a button to press.
 */
export const AbilityKeyBadge = ({ slotKey }: { slotKey: string }) => {
  const bindings = useBindings();
  const onPad = useSyncExternalStore(subscribeLastDevice, getLastDevice) === "gamepad";
  const action = `ability${slotKey}` as BindAction;
  if (!(action in bindings.keyboard)) return null;
  const pad = bindings.gamepad[action];
  const key = bindings.keyboard[action][0] ?? bindings.keyboard[action][1];
  if (onPad ? !pad : !key) return null;
  return (
    <Box
      sx={{
        position: "absolute",
        /* As far past the corner as the highlight's A on the opposite one: 3px past the inside
           of the slot's 1px border (`KEY_OVERHANG`) */
        /* With a controller the highlight's A takes the bottom-right, so it moves up top */
        ...(onPad ? { top: "-2px" } : { bottom: "-2px" }),
        right: "-2px",
        /* Over the menu highlight's line (2), which is drawn beside the slot */
        zIndex: 3,
        pointerEvents: "none",
        opacity: 0.85,
      }}
    >
      {onPad && pad ? (
        <PadCombo pad={pad} />
      ) : (
        /* The same key cap as everywhere else; display only, it lights up as the key is pressed */
        <KeyboardKey name={key as string} showOnly sx={{ position: "relative" }} />
      )}
    </Box>
  );
};
