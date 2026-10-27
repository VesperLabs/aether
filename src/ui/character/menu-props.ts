import type { FullCharacterWire } from "@/network";
import type { SlotEvents } from "@/ui/item";

/** The props of the menus that show a character (the hero in the game, any player in the wiki). */
export interface CharacterMenuProps {
  player?: Partial<FullCharacterWire> | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  /** What dragging and double-clicking an item does; the wiki leaves it out, so its slots are display-only. */
  events?: SlotEvents;
}
