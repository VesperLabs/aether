import { Button, Flex, Icon, Link as ExternalLink, Text } from "@/ui";
import { MENU_BUTTON, PLAY_BUTTON } from "./menu-bar";

/** Links out of the wiki: into the game and to the Discord. */
const LINKS = [
  { href: process.env.GAME_URL, label: "Play", icon: "success" },
  { href: "https://discord.gg/yadDyqpb6D", label: "Discord", icon: "chat" },
];

/** Play and Discord side by side; on phones Play keeps its label and Discord is just its icon. */
export const PlayLinks = () => (
  <Flex sx={{ gap: 2 }}>
    {LINKS.map(({ href, label, icon }) => (
      <Button
        key={label}
        /* A plain link: wouter's Link would route these inside the wiki instead of leaving it. */
        as={ExternalLink}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        variant="menu"
        /* Just an icon on phones, so no room kept for a label on its right. */
        sx={label === "Play" ? PLAY_BUTTON : { ...MENU_BUTTON, pr: [1, 2] }}
      >
        <Icon size={28} icon={`./assets/icons/${icon}.png`} />
        <Text sx={{ display: label === "Play" ? "block" : ["none", "block"] }}>{label}</Text>
      </Button>
    ))}
  </Flex>
);
