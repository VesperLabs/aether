import { Flex, Icon, Text } from "@/ui";
import { Link, useLocation } from "wouter";
import { NAV, TAB_HEIGHT } from "./menu-bar";
import { PAPER } from "./paper";

/**
 * The wiki's sections as a parchment tab bar fixed to the bottom of the screen, on phones only
 * (where it replaces the footer).
 */
export const TabBar = () => {
  const [page] = useLocation();
  return (
    <Flex
      as="nav"
      sx={{
        display: ["flex", "none"],
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2,
        flexDirection: "column",
        bg: PAPER.fill,
        borderTop: `1px solid ${PAPER.rule}`,
        boxShadow: "0 -2px 8px rgba(0, 0, 0, .3)",
      }}
    >
      <Flex sx={{ height: TAB_HEIGHT }}>
        {NAV.map(({ href, label, icon }) => {
          const active = href === page;
          return (
            <Link key={href} href={href} style={{ flex: 1, textDecoration: "none" }}>
              <Flex
                sx={{
                  height: "100%",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "2px",
                  color: active ? PAPER.ink : PAPER.muted,
                  bg: active ? PAPER.frame : "transparent",
                  "&, & *": { textShadow: "none" },
                }}
              >
                <Icon size={28} icon={`./assets/icons/${icon}.png`} />
                <Text sx={{ fontSize: 0, fontWeight: active ? 700 : 600 }}>{label}</Text>
              </Flex>
            </Link>
          );
        })}
      </Flex>
    </Flex>
  );
};
