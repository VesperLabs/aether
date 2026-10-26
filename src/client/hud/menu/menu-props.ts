import type { HudCharacter } from "@/client/hud/app/context";

/** The props of the HUD menus that show a character (the hero in the game, any player in the wiki). */
export interface CharacterMenuProps {
  player?: Partial<HudCharacter> | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  /** Whether items can be moved, used and dragged; the wiki turns this off. */
  slotsEnabled?: boolean;
}
