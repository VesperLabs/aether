import { Box, Button, Flex, Icon, Link as ExternalLink, Text } from "@/ui";
import { Link, useLocation } from "wouter";
import { MENU_BUTTON, WOOD_BAR } from "./wood-menu";

const NAV = [
  { href: "/", label: "Home", icon: "book" },
  { href: "/players", label: "Players", icon: "social" },
  { href: "/items", label: "Items", icon: "chest" },
  { href: "/keepers", label: "Keepers", icon: "pouch" },
  { href: "/monsters", label: "Monsters", icon: "bounty" },
];

/** Links out of the wiki, at the far right of the menu. */
const LINKS = [
  { href: process.env.GAME_URL, label: "Play", icon: "attack" },
  { href: "https://discord.gg/yadDyqpb6D", label: "Discord", icon: "chat" },
];

/**
 * The wiki's header: the logo, then the wiki's sections and links to play and to the Discord in a
 * wood menu bar like the game's own.
 */
export const Header = () => {
  const [page] = useLocation();
  return (
    <Flex
      as="header"
      sx={{
        position: "relative",
        zIndex: 1,
        /* Up into the page's top padding (32px). */
        mt: "-16px",
        gap: [3, 4],
        flexWrap: ["wrap", "nowrap"],
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Box
        as="img"
        {...{ src: "./assets/images/logo.png", alt: "Aether" }}
        sx={{
          display: "block",
          height: [40, 56],
          flexShrink: 0,
          /* Sits a little higher than the menu. */
          transform: ["translateY(-3px)", "translateY(-6px)"],
          /* Sits on the map, so a soft shadow keeps the white letters readable over bright tiles. */
          filter: "drop-shadow(0 2px 6px rgba(0, 0, 0, .7)) drop-shadow(0 0 2px rgba(0, 0, 0, .6))",
        }}
      />
      <Flex
        as="nav"
        sx={{
          ...WOOD_BAR,
          flexWrap: ["wrap", "nowrap"],
        }}
      >
        {NAV.map(({ href, label, icon }) => (
          <Button
            key={href}
            as={Link}
            {...{ href }}
            variant="menu"
            className={href === page ? "active" : ""}
            sx={MENU_BUTTON}
          >
            <Icon size={28} icon={`./assets/icons/${icon}.png`} />
            <Text sx={{ display: ["none", "block"] }}>{label}</Text>
          </Button>
        ))}
        {LINKS.map(({ href, label, icon }) => (
          <Button
            key={label}
            /* A plain link: wouter's Link would route these inside the wiki instead of leaving it. */
            as={ExternalLink}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            variant="menu"
            sx={MENU_BUTTON}
          >
            <Icon size={28} icon={`./assets/icons/${icon}.png`} />
            <Text sx={{ display: ["none", "block"] }}>{label}</Text>
          </Button>
        ))}
      </Flex>
    </Flex>
  );
};
