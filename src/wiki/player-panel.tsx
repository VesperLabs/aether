import {
  Box,
  Button,
  Flex,
  Icon,
  MenuAbilities,
  MenuBag,
  MenuEquipment,
  MenuInventory,
  MenuStats,
  PlayerRender,
  Text,
} from "@/ui";
import { useState, type MouseEvent } from "react";
import type { WikiPlayer } from "./page-players";
import { About } from "./player-card";

/** The game menus the panel shows, one at a time. */
const SECTIONS = [
  { key: "equipment", label: "Equipment", icon: "helmet", Menu: MenuEquipment },
  { key: "inventory", label: "Inventory", icon: "bag", Menu: MenuInventory },
  { key: "stats", label: "Stats", icon: "stats", Menu: MenuStats },
  { key: "abilities", label: "Abilities", icon: "book", Menu: MenuAbilities },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

/** Opening and closing mirror each other: easing out as it arrives, in as it leaves. */
const SLIDE = ".22s cubic-bezier(0, 0, .2, 1) both";
const FADE_OUT = ".22s cubic-bezier(.4, 0, 1, 1) both";

/** The open tab and its menu share this backing, so they read as one piece. */
const MENU_BACKING = "rgba(0, 0, 0, .3)";

/** The game's blue line marking the open menu. */
const ACTIVE_LINE = "#bfdbfe";

/** Width of the drawer on wider screens. */
export const PLAYER_PANEL_WIDTH = 410;

/**
 * The selected player's game menus, one tab at a time, on the game's dark panel. A drawer over the
 * right of the screen on wider screens, full screen on phones; either way the list under it never
 * moves.
 */
export const PlayerPanel = ({
  player,
  closing,
  onClose,
  onClosed,
}: {
  player: WikiPlayer;
  /** Slide out, then call `onClosed` so the page can unmount it. */
  closing: boolean;
  onClose: () => void;
  onClosed: () => void;
}) => {
  const [open, setOpen] = useState<SectionKey>("equipment");
  /* Open bags belong to one player: switching players closes them. */
  const [openBags, setOpenBags] = useState({ playerId: player.id, ids: [] as string[] });
  const bags = openBags.playerId === player.id ? openBags.ids : [];
  const toggleBag = (id: string) =>
    setOpenBags({
      playerId: player.id,
      ids: bags.includes(id) ? bags.filter((bag) => bag !== id) : [...bags, id],
    });

  /* Clicking a bag in the inventory opens it under the menu, as in the game. */
  const onMenuClick = (event: MouseEvent) => {
    const { id, base } = (event.target as HTMLElement).dataset ?? {};
    if (base === "bag" && id) toggleBag(id);
  };

  const section = SECTIONS.find(({ key }) => key === open) ?? SECTIONS[0];
  return (
    <Box
      as="aside"
      onAnimationEnd={() => closing && onClosed()}
      sx={{
        /* The game's own dark panel, so its menus sit in their element. */
        bg: "rgba(0, 0, 0, .55)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        /* Edged only where it meets the page. */
        borderLeft: [null, "1px solid rgba(255, 255, 200, .25)"],
        color: "text",
        position: "fixed",
        right: 0,
        left: [0, "auto"],
        top: 0,
        bottom: 0,
        /* Over the tab bar too: full screen on phones. */
        zIndex: 3,
        width: ["auto", PLAYER_PANEL_WIDTH],
        overflowY: "auto",
        /* Slides in from its edge: up on phones, from the right on wider screens. */
        animation: closing
          ? [`sheet-down ${FADE_OUT}`, `drawer-out ${FADE_OUT}`]
          : [`sheet-up ${SLIDE}`, `drawer-in ${SLIDE}`],
        boxSizing: "border-box",
        p: 2,
      }}
    >
      {/* The player, as on their card: face, name, level and class, a line about them. */}
      <Flex sx={{ alignItems: "center", gap: 3, pr: 4 }}>
        <FaceRing player={player} />
        <Box sx={{ minWidth: 0 }}>
          <Text as="h3" sx={{ fontSize: 4, fontWeight: 700, m: 0 }}>
            {player.profile?.userName}
          </Text>
          <Text as="p" sx={{ fontSize: 1, fontWeight: 600, m: 0, textTransform: "capitalize" }}>
            Level {player.stats?.level ?? 1} {player.charClass}
          </Text>
          <Text as="p" sx={{ opacity: 0.6, fontSize: 0, m: 0 }}>
            <About player={player} />
          </Text>
        </Box>
      </Flex>
      {/* In the corner, out of the header's way. */}
      <Box
        as="button"
        title="Close"
        onClick={onClose}
        sx={{
          position: "absolute",
          top: 2,
          right: 2,
          p: 1,
          lineHeight: 1,
          bg: "transparent",
          border: "none",
          color: "text",
          font: "inherit",
          cursor: "pointer",
          opacity: 0.8,
          "&:hover": { opacity: 1 },
        }}
      >
        {/* The game's own close button, as in its menu headers. */}❌
      </Box>
      {/* Folder tabs: the open one shares the menu's backing and runs into it, standing in for
          the menu's own header. */}
      <Flex sx={{ gap: 1, mt: 3 }}>
        {SECTIONS.map(({ key, label, icon }) => {
          const active = key === open;
          return (
            <Button
              key={key}
              title={label}
              onClick={() => setOpen(key)}
              className={active ? "active" : ""}
              sx={{
                /* The same padding whichever is open; the open one is twice as wide, for its name. */
                flex: active ? "2 1 0" : "1 1 0",
                minWidth: 0,
                gap: 1,
                p: "2px",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px 6px 0 0",
                /* A plain button, not the game's menu one, whose separate pressed line doesn't fit
                   a tab: lighter on hover, and the open tab joins the menu's backing with a blue
                   line drawn on the tab itself. */
                bg: "shadow.10",
                "&:hover": { bg: "shadow.20" },
                "&.active": { bg: MENU_BACKING, boxShadow: `inset 0 2px 0 ${ACTIVE_LINE}` },
              }}
            >
              <Icon size={28} icon={`./assets/icons/${icon}.png`} />
              {/* Only the open tab has room for its name, which titles the menu below. */}
              {active && <Text sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</Text>}
            </Button>
          );
        })}
      </Flex>
      <Box
        onClick={onMenuClick}
        sx={{
          bg: MENU_BACKING,
          borderRadius: 6,
          /* Square where the open tab joins it. */
          ...(open === SECTIONS[0].key && { borderTopLeftRadius: 0 }),
          ...(open === SECTIONS[SECTIONS.length - 1].key && { borderTopRightRadius: 0 }),
          p: 2,
          "& > div": { bg: "transparent", alignItems: "center", p: 0 },
          /* The tab is this menu's header; bags keep theirs, to close them by. */
          "& > div:first-of-type > :first-child": { display: "none" },
        }}
      >
        <section.Menu player={player} isOpen setIsOpen={onClose} />
        {open === "inventory" && (
          <MenuBag player={player} bagState={bags} toggleBagState={toggleBag} />
        )}
      </Box>
    </Box>
  );
};

/** Size of the face ring in the drawer's header. */
const RING = 56;

/**
 * The player's face in a ring. The character is drawn 200px tall around its box's centre with the
 * head about 20px above it, so the drawing is moved down to bring the head to the ring's centre.
 */
const FaceRing = ({ player }: { player: WikiPlayer }) => (
  <Box
    sx={{
      position: "relative",
      width: RING,
      height: RING,
      flexShrink: 0,
      borderRadius: "50%",
      overflow: "hidden",
      bg: "shadow.20",
      border: "1px solid rgba(255, 255, 200, .4)",
    }}
  >
    <PlayerRender player={player} sx={{ width: RING, height: RING, top: "20px" }} />
  </Box>
);
