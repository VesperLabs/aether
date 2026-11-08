import { useEffect, useState } from "react";
import { Box, Portal, Text } from "@/ui";
import { PAD_DROP_EVENT, PAD_USE_EVENT } from "@/ui/item/pad-slot-events";
import {
  PAD_ITEM_MENU_ATTR,
  PAD_ITEM_MENU_EVENT,
  openPadItemMenu,
  type PadItemMenuEvent,
} from "@/client/input/pad-item-menu-events";
import { holdNavItem } from "@/client/input/pad-nav";
import { CONSUMABLES_BASES, checkSlotsMatch } from "@/rules/inventory";

/* As the chat's command list highlights its rows */
const HIGHLIGHT = "rgba(255,255,255,.12)";
/** Space between the item and its menu, and the screen's edge. */
const SPACE = 8;

/** What can be done with an item from its menu; the first is highlighted when it opens. */
type Option = "Use" | "Unequip" | "Move" | "Drop";

/** What can be done with the item in `slot`; the first is highlighted when the menu opens. */
function optionsFor(slot: Element) {
  const worn = isWorn(slot);
  return [
    /* Worn (equipment, abilities): take it off. Else use or put it on */
    ...(worn
      ? freeInventorySlot()
        ? [{ label: "Unequip" as const, hint: "Into your inventory" }]
        : []
      : [{ label: "Use" as const, hint: "Use or equip" }]),
    { label: "Move" as const, hint: "Pick up to place" },
    /* Last, so it's never what A lands on by habit. B closes the menu */
    { label: "Drop" as const, hint: "On the ground" },
  ];
}

const isWorn = (slot: Element) =>
  ["equipment", "abilities"].includes(slot.getAttribute("data-location") ?? "");

/** The first empty slot in the inventory. */
const freeInventorySlot = () =>
  [...document.querySelectorAll(`[data-location="inventory"][data-slot-key]`)].find(
    (s) => !s.getAttribute("data-base"),
  ) ?? null;

/** Where `slot`'s item would be equipped: a free matching slot first, else one to swap with. */
function equipSlotFor(slot: Element) {
  const type = slot.getAttribute("data-slot-type");
  if (!type || isWorn(slot)) return null;
  /* Food and potions are eaten, bags opened, wherever they could also sit */
  const base = slot.getAttribute("data-base") ?? "";
  if (CONSUMABLES_BASES.includes(base) || base === "bag") return null;
  const location = type === "spell" ? "abilities" : "equipment";
  const slots = [...document.querySelectorAll(`[data-location="${location}"][data-slot-key]`)];
  const fits = slots.filter(
    (s) => location === "abilities" || checkSlotsMatch(type, s.getAttribute("data-slot-key")),
  );
  return fits.find((s) => !s.getAttribute("data-base")) ?? fits[0] ?? null;
}

function act(option: Option, slot: Element) {
  openPadItemMenu(null);
  if (option === "Drop") {
    const ground = document.querySelector("#game canvas");
    if (ground) slot.dispatchEvent(new CustomEvent(PAD_DROP_EVENT, { detail: ground }));
  } else if (option === "Use") {
    /* Equipment and spells equip as a drag onto their slot would; the rest use as a double-click */
    const target = equipSlotFor(slot);
    slot.dispatchEvent(
      target ? new CustomEvent(PAD_DROP_EVENT, { detail: target }) : new CustomEvent(PAD_USE_EVENT),
    );
  } else if (option === "Unequip") {
    const target = freeInventorySlot();
    if (target) slot.dispatchEvent(new CustomEvent(PAD_DROP_EVENT, { detail: target }));
  } else if (option === "Move") {
    holdNavItem(slot);
  }
}

/**
 * The menu a controller opens by holding A on an item: a wooden list beside it, styled as the
 * chat's command list. The menu highlight moves through it and A picks; B closes it.
 */
export const PadItemMenu = () => {
  const [slot, setSlot] = useState<Element | null>(null);

  useEffect(() => {
    const onMenu = (e: Event) => setSlot((e as PadItemMenuEvent).detail);
    window.addEventListener(PAD_ITEM_MENU_EVENT, onMenu);
    return () => window.removeEventListener(PAD_ITEM_MENU_EVENT, onMenu);
  }, []);

  if (!slot?.isConnected) return null;
  const r = slot.getBoundingClientRect();
  /* Beside the item, on whichever side has room */
  const onRight = r.right + 200 < window.innerWidth;
  return (
    <Portal container={document.body}>
      <Box
        {...{ [PAD_ITEM_MENU_ATTR]: true }}
        variant="buttons.wood"
        style={{
          top: Math.max(SPACE, Math.min(r.top, window.innerHeight - 160)),
          ...(onRight ? { left: r.right + SPACE } : { right: window.innerWidth - r.left + SPACE }),
        }}
        sx={{
          position: "fixed",
          zIndex: "tooltip",
          display: "grid",
          gridTemplateColumns: "max-content 1fr",
          rowGap: "2px",
          minWidth: 180,
          p: 1,
          cursor: "default",
          pointerEvents: "all",
        }}
      >
        {optionsFor(slot).map(({ label, hint }) => (
          <Box
            key={label}
            as="button"
            onClick={() => act(label, slot)}
            sx={{
              gridColumn: "1 / -1",
              display: "grid",
              gridTemplateColumns: "subgrid",
              alignItems: "center",
              columnGap: 3,
              px: 2,
              py: 1,
              border: 0,
              borderRadius: 3,
              bg: "transparent",
              color: "inherit",
              font: "inherit",
              textAlign: "left",
              cursor: "pointer",
              "&:hover, &[data-pad-focus]": { bg: HIGHLIGHT },
            }}
          >
            <Text sx={{ fontWeight: "bold", color: "white", fontSize: 2, lineHeight: 1 }}>
              {label}
            </Text>
            <Text sx={{ color: "gray.100", opacity: 0.6, fontSize: 1, lineHeight: 1 }}>{hint}</Text>
          </Box>
        ))}
      </Box>
    </Portal>
  );
};
