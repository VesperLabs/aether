import { useEffect, useState } from "react";
import { Box, Portal, Text } from "@/ui";
import { PAD_DROP_EVENT, PAD_USE_EVENT } from "@/ui/item/pad-slot-events";
import {
  PAD_ITEM_MENU_ATTR,
  PAD_ITEM_MENU_EVENT,
  openPadItemMenu,
  type PadItemMenuEvent,
} from "@/client/input/pad-item-menu-events";
import { focusNavOn, holdNavItem } from "@/client/input/pad-nav";
import { useAppContext } from "@/client/hud/app/context";
import { CONSUMABLES_BASES, checkSlotsMatch } from "@/rules/inventory";

/* As the chat's command list highlights its rows */
const HIGHLIGHT = "rgba(255,255,255,.12)";
/** Space between the item and its menu, and the screen's edge. */
const SPACE = 8;

/** What can be done with an item from its menu; the first is highlighted when it opens. */
type Option =
  | "Use"
  | "Unequip"
  | "Buy"
  | "Sell"
  | "Move"
  | "To inventory"
  | "To equipment"
  | "Drop";

/** What can be done with the item in `slot`; the first is highlighted when the menu opens. */
function optionsFor(slot: Element) {
  /* A shop's item: bought into the first free slot, or one picked with Move */
  if (slot.getAttribute("data-location") === "shop") {
    return [
      ...(freeInventorySlot() ? [{ label: "Buy" as const, hint: "Into your inventory" }] : []),
      /* Their menus may be shut: these open one, the item in hand to place */
      { label: "To inventory" as const, hint: "Pick a slot to buy into" },
      ...(equipLocation(slot) ? [{ label: "To equipment" as const, hint: "Buy and wear" }] : []),
    ];
  }
  const worn = isWorn(slot);
  return [
    /* Worn (equipment, abilities): take it off. Else use or put it on */
    ...(worn
      ? freeInventorySlot()
        ? [{ label: "Unequip" as const, hint: "Into your inventory" }]
        : []
      : [{ label: "Use" as const, hint: "Use or equip" }]),
    /* With a shop open, sold as dropping it on the NPC's menu does */
    ...(openShop() ? [{ label: "Sell" as const, hint: "To the shop" }] : []),
    { label: "Move" as const, hint: "Pick up to place" },
    /* Last, so it's never what A lands on by habit. B closes the menu */
    { label: "Drop" as const, hint: "On the ground" },
  ];
}

const isWorn = (slot: Element) =>
  ["equipment", "abilities"].includes(slot.getAttribute("data-location") ?? "");

/** The NPC's menu, while their shop is showing: dropping an item on it sells it. */
const openShop = () => {
  const shopSlot = document.querySelector(`.menu-keeper [data-location="shop"][data-slot-key]`);
  return shopSlot?.getBoundingClientRect().width ? shopSlot.closest(".menu-keeper") : null;
};

/** The first empty slot in the inventory. */
const freeInventorySlot = () =>
  [...document.querySelectorAll(`[data-location="inventory"][data-slot-key]`)].find(
    (s) => !s.getAttribute("data-base"),
  ) ?? null;

/** Which menu `slot`'s item is worn from, if it's worn at all. Needs no menu open. */
function equipLocation(slot: Element) {
  const type = slot.getAttribute("data-slot-type");
  if (!type || isWorn(slot)) return null;
  /* Food and potions are eaten, bags opened, wherever they could also sit */
  const base = slot.getAttribute("data-base") ?? "";
  if (CONSUMABLES_BASES.includes(base) || base === "bag") return null;
  return type === "spell" ? "abilities" : "equipment";
}

/** Where `slot`'s item would be equipped: a free matching slot first, else one to swap with. */
function equipSlotFor(slot: Element) {
  const location = equipLocation(slot);
  const type = slot.getAttribute("data-slot-type") ?? "";
  if (!location) return null;
  const slots = [...document.querySelectorAll(`[data-location="${location}"][data-slot-key]`)];
  const fits = slots.filter(
    (s) => location === "abilities" || checkSlotsMatch(type, s.getAttribute("data-slot-key")),
  );
  return fits.find((s) => !s.getAttribute("data-base")) ?? fits[0] ?? null;
}

type CarryMenu = "inventory" | "equipment" | "abilities";

/** Opens that menu, if shut. */
type OpenMenu = (menu: CarryMenu) => void;

/** How many frames to wait for a menu to open before giving up. */
const OPEN_FRAMES = 30;

/**
 * Picks up `slot`'s item, opens `menu`, and puts the highlight on the slot `find` picks there.
 * A shut menu's slots may not be on the page yet, so it's found once the menu shows.
 */
function carryTo(slot: Element, menu: CarryMenu, find: () => Element | null, openMenu: OpenMenu) {
  openMenu(menu);
  holdNavItem(slot);
  let frames = 0;
  const land = () => {
    const target = find();
    if (target?.getBoundingClientRect().width) return focusNavOn(target);
    if (++frames < OPEN_FRAMES) requestAnimationFrame(land);
  };
  requestAnimationFrame(land);
}

const firstInventorySlot = () =>
  freeInventorySlot() ?? document.querySelector(`[data-location="inventory"][data-slot-key]`);

function act(option: Option, slot: Element, openMenu: OpenMenu) {
  openPadItemMenu(null);
  if (option === "To inventory") return carryTo(slot, "inventory", firstInventorySlot, openMenu);
  const wornIn = equipLocation(slot);
  if (option === "To equipment" && wornIn) {
    return carryTo(slot, wornIn, () => equipSlotFor(slot), openMenu);
  }
  if (option === "Drop") {
    const ground = document.querySelector("#game canvas");
    if (ground) slot.dispatchEvent(new CustomEvent(PAD_DROP_EVENT, { detail: ground }));
  } else if (option === "Use") {
    /* Equipment and spells equip as a drag onto their slot would; the rest use as a double-click */
    const target = equipSlotFor(slot);
    slot.dispatchEvent(
      target ? new CustomEvent(PAD_DROP_EVENT, { detail: target }) : new CustomEvent(PAD_USE_EVENT),
    );
  } else if (option === "Sell") {
    const shop = openShop();
    if (shop) slot.dispatchEvent(new CustomEvent(PAD_DROP_EVENT, { detail: shop }));
  } else if (option === "Unequip" || option === "Buy") {
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
  const { setTabInventory, setTabEquipment, setTabAbilities } = useAppContext();
  const openMenu: OpenMenu = (menu) =>
    ({ inventory: setTabInventory, abilities: setTabAbilities, equipment: setTabEquipment })[menu](
      true,
    );

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
            onClick={() => act(label, slot, openMenu)}
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
