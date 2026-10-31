import { Box, Button, Flex, Icon, Text } from "@/ui";
import { Link, useLocation } from "wouter";
import { MENU_BAR, MENU_BUTTON, NAV } from "./menu-bar";
import { PlayLinks } from "./play-links";

/**
 * The wiki's header: the logo, then the wiki's sections and links to play and to the Discord. On
 * phones the sections move to the bottom tab bar, leaving just the logo and the links up here.
 */
export const Header = () => {
  const [page] = useLocation();
  return (
    <Flex
      as="header"
      sx={{
        position: "relative",
        zIndex: 1,
        /* The menu drops under the logo as soon as it no longer fits beside it. */
        columnGap: [3, 4],
        rowGap: 1,
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Box
        as="img"
        {...{ src: "./assets/images/logo.png", alt: "Aether" }}
        sx={{
          display: "block",
          height: [28, 56],
          flexShrink: 0,
          /* Sits a little higher than the menu. */
          transform: ["translateY(-2px)", "translateY(-6px)"],
          /* Sits on the map, so a soft shadow keeps the white letters readable over bright tiles. */
          filter: "drop-shadow(0 2px 6px rgba(0, 0, 0, .7)) drop-shadow(0 0 2px rgba(0, 0, 0, .6))",
        }}
      />
      {/* The home page has its own big pair in the middle; an empty cell keeps the grid. */}
      <Flex
        as="nav"
        sx={{
          ...MENU_BAR,
          /* Full width before it shrinks, so it wraps under the logo instead of cutting buttons off;
             only a menu wider than the whole row wraps its own buttons. */
          flexShrink: 0,
          maxWidth: "100%",
          boxSizing: "border-box",
          flexWrap: "wrap",
        }}
      >
        {NAV.map(({ href, label, icon }) => (
          <Button
            key={href}
            as={Link}
            {...{ href }}
            variant="menu"
            className={href === page ? "active" : ""}
            sx={{ ...MENU_BUTTON, display: ["none", "flex"] }}
          >
            <Icon size={28} icon={`./assets/icons/${icon}.png`} />
            <Text>{label}</Text>
          </Button>
        ))}
        {/* At the far right of the menu; on phones, where the sections are in the tab bar, alone
            at the top right. */}
        <PlayLinks />
      </Flex>
    </Flex>
  );
};
