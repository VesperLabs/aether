/** The game's wood, as on its wood buttons: the background of the wiki's menu bars. */
export const WOOD_BAR = {
  p: 2,
  gap: 2,
  bg: "yellow.900",
  border: "1px solid #000",
  boxShadow: "inset 0px 0px 0px 1px rgba(255,255,255,.25)",
  borderRadius: 6,
} as const;

/** A `menu` variant button with an icon and label, as in the game's own menus. */
export const MENU_BUTTON = {
  position: "relative",
  alignItems: "center",
  gap: 1,
  pr: 2,
  color: "text",
  /* The button centers its children, so pin the active line to its top edge. */
  "&.active::before": { top: 0, left: 0, m: 0 },
} as const;
