import type { ReactNode } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import type { BuiltItem } from "@/content";
import { Flex, Menu, MENU_MAX_WIDTH, MenuHeader } from "@/ui/kit";
import { ItemSlot } from "@/ui/item";
import type { CharacterMenuProps } from "./menu-props";

export interface MenuSlot {
  slotKey: string;
  item?: BuiltItem | null;
  /** Shown when the slot is empty. */
  icon: string;
}

interface SlotMenuProps extends Pick<CharacterMenuProps, "player" | "events"> {
  title: ReactNode;
  icon: string;
  isOpen?: boolean;
  onClose: () => void;
  location: string;
  bagId?: string;
  slots: MenuSlot[];
  sx?: ThemeUIStyleObject;
  children?: ReactNode;
}

/** A menu that is a grid of item slots: equipment, inventory, abilities, a bag. */
export const SlotMenu = ({
  title,
  icon,
  isOpen = true,
  onClose,
  location,
  bagId,
  slots,
  player,
  events,
  sx,
  children,
}: SlotMenuProps) => (
  <Menu sx={{ display: isOpen ? "flex" : "none", ...sx }}>
    <MenuHeader icon={icon} onClick={onClose}>
      {title}
    </MenuHeader>
    <Flex sx={{ gap: 2, flexWrap: "wrap", justifyContent: "end", maxWidth: MENU_MAX_WIDTH }}>
      {slots.map(({ slotKey, item, icon }) => (
        <ItemSlot
          key={`${bagId ?? location}-${slotKey}`}
          player={player}
          location={location}
          slotKey={slotKey}
          bagId={bagId}
          icon={icon}
          item={item}
          events={events}
        />
      ))}
    </Flex>
    {children}
  </Menu>
);
