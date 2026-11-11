import type { QuestId } from "@/content";
import {
  Box,
  Flex,
  Icon,
  KeyboardButton,
  MenuAbilities,
  MenuBag,
  MenuEquipment,
  MenuInventory,
  MenuStats,
  Modal,
  Text,
} from "@/ui";
import { useState, type MouseEvent } from "react";
import type { WikiPlayer } from "./page-players";
import { About } from "./player-card";
import { CharacterFace } from "./card-pool";
import { QuestIcon } from "./quest-icon";
import { WalkOnHover } from "./walk-on-hover";

/** The game menus the modal shows, one tab at a time. */
const SECTIONS = [
  { key: "equipment", label: "Equipment", icon: "helmet", Menu: MenuEquipment },
  { key: "inventory", label: "Inventory", icon: "bag", Menu: MenuInventory },
  { key: "stats", label: "Stats", icon: "stats", Menu: MenuStats },
  { key: "abilities", label: "Abilities", icon: "book", Menu: MenuAbilities },
  { key: "quests", label: "Quests", icon: "quests", Menu: undefined },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

/**
 * A player's game menus in the game's gilded modal, one tab at a time. Esc, the Close button or a
 * click outside closes it.
 */
export const CharacterModal = ({
  player,
  onClose,
}: {
  player: WikiPlayer;
  onClose: () => void;
}) => {
  const [open, setOpen] = useState<SectionKey>(SECTIONS[0].key);
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
  /* The quests the player has taken, with how far along they are. */
  const quests = player.quests ?? [];
  return (
    <>
      <Modal.Overlay sx={{ backgroundColor: "shadow.50" }} onClick={onClose} />
      <Modal sx={{ width: "min(430px, calc(100vw - 16px))", color: "text" }}>
        {/* The character, as on their card: face, name, level and class, a line about them. */}
        <Modal.Header cap titleRule={false} sx={{ gap: 3, py: 2 }}>
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
        </Modal.Header>
        <Flex sx={{ flexDirection: "column" }}>
          <Flex role="tablist">
            {SECTIONS.map(({ key, label, icon }) => (
              <Modal.Tab
                key={key}
                active={key === section.key}
                onClick={() => setOpen(key)}
                title={label}
              >
                <Icon size={24} icon={`./assets/icons/${icon}.png`} />
                {/* Only the open tab has room for its name. */}
                {key === section.key && label}
              </Modal.Tab>
            ))}
          </Flex>
          <Modal.Body
            onClick={onMenuClick}
            sx={{
              p: 2,
              alignItems: "center",
              borderRadius: Modal.tabPanelRadius(section.key === SECTIONS[0].key),
              "& > div": { bg: "transparent", alignItems: "center", p: 0 },
              /* The tab is this menu's header; bags keep theirs, to close them by. */
              "& > div:first-of-type > :first-child": { display: "none" },
            }}
          >
            {section.Menu ? (
              <section.Menu player={player} isOpen setIsOpen={onClose} />
            ) : (
              <Flex sx={{ gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
                {quests.map((status) => (
                  <QuestIcon
                    key={status.questId}
                    id={status.questId as QuestId}
                    playerQuest={status}
                  />
                ))}
                {!quests.length && <Text sx={{ opacity: 0.6 }}>No quests</Text>}
              </Flex>
            )}
            {section.key === "inventory" && (
              <MenuBag player={player} bagState={bags} toggleBagState={toggleBag} />
            )}
          </Modal.Body>
        </Flex>
        <Modal.Footer>
          <KeyboardButton sx={{ flex: 1 }} onClick={onClose} keyboardKey="ESCAPE">
            Close
          </KeyboardButton>
        </Modal.Footer>
      </Modal>
    </>
  );
};

/** Size of the face ring in the modal's header. */
const RING = 56;

/**
 * The character's face in a ring. A person is drawn 200px tall around its box's centre with the
 * head about 20px above it, so the drawing is moved down to bring the head to the ring's centre.
 */
const FaceRing = ({ player }: { player: WikiPlayer }) => (
  <WalkOnHover
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
    <CharacterFace character={player} sx={{ width: RING, height: RING, top: "20px" }} />
  </WalkOnHover>
);
