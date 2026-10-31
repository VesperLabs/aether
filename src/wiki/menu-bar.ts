import { PAPER } from "./paper";

/** The wiki's sections, in the desktop menu and the phone tab bar. */
export const NAV = [
  { href: "/", label: "Home", icon: "book" },
  { href: "/players", label: "Players", icon: "social" },
  { href: "/items", label: "Items", icon: "chest" },
  { href: "/keepers", label: "Keepers", icon: "pouch" },
  { href: "/monsters", label: "Monsters", icon: "bounty" },
];

/** The dark brown outline of the wiki's raised buttons. */
const EDGE = "#6b5236";

/** Height of the phone tab bar's tabs. */
export const TAB_HEIGHT = 56;

/** The wiki's menu bars: just a row of buttons, each with its own backing. */
export const MENU_BAR = {
  gap: 2,
} as const;

/** A parchment `menu` button with an icon and label, matching the wiki's paper cards. */
export const MENU_BUTTON = {
  position: "relative",
  alignItems: "center",
  gap: 1,
  pr: 2,
  /* Keeps its full label: a crowded bar wraps the buttons instead of squashing them. */
  flexShrink: 0,
  whiteSpace: "nowrap",
  color: PAPER.ink,
  fontWeight: 600,
  /* Dark ink on paper: drop the outline the theme gives all text. */
  "&, & *": { textShadow: "none" },
  bg: PAPER.fill,
  /* A crisp dark edge, a 1px shine along the top inside it and a faint drop shadow. */
  border: `1px solid ${EDGE}`,
  borderRadius: 6,
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, .9), 0 1px 3px rgba(0, 0, 0, .2)",
  "&:hover": { bg: PAPER.frame },
  /* The current page is a darker paper, flat, without the shine. */
  "&.active": { bg: PAPER.rule, boxShadow: "none" },
  "&.active::before": { display: "none" },
} as const;

/** The call to action: the same shape as a menu button, but in the accent ink so it stands out. */
export const PLAY_BUTTON = {
  ...MENU_BUTTON,
  px: 3,
  color: "#fff",
  bg: PAPER.accent,
  borderColor: "#1d4f8a",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, .45), 0 1px 3px rgba(0, 0, 0, .2)",
  "&:hover": { bg: PAPER.accent, filter: "brightness(1.1)" },
} as const;

/** The screen height the phone tab bar covers. */
export const TAB_BAR_SPACE = TAB_HEIGHT;
