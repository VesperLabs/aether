import { memo } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import type { BuiltItem } from "@/content";
import { MAX_INVENTORY_ITEMS } from "@/rules/inventory";
import { arePropsEqualWithKeys, Flex, Icon, Text } from "@/ui/kit";
import type { CharacterMenuProps } from "./menu-props";
import { SlotMenu, type MenuSlot } from "./slot-menu";

/** Slots `0..count-1` filled from a list. */
const listSlots = (count: number, items: (BuiltItem | null)[] = [], icon: string): MenuSlot[] =>
  Array.from({ length: count }, (_, idx) => ({ slotKey: `${idx}`, item: items[idx], icon }));

export const MenuEquipment = memo(
  ({ player, isOpen, setIsOpen, events }: CharacterMenuProps) => (
    <SlotMenu
      title="Equipment"
      icon="./assets/icons/helmet.png"
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      location="equipment"
      player={player}
      events={events}
      slots={Object.entries<BuiltItem>(player?.equipment || {}).map(([slotKey, item]) => ({
        slotKey,
        item,
        icon: `./assets/icons/${slotKey}.png`,
      }))}
    />
  ),
  arePropsEqualWithKeys(["isOpen", "player.equipment", "player.activeItemSlots"]),
);

export const MenuAbilities = memo(
  ({ player, isOpen, setIsOpen, events }: CharacterMenuProps) => (
    <SlotMenu
      title="Abilities"
      icon="./assets/icons/book.png"
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      location="abilities"
      player={player}
      events={events}
      sx={{ alignItems: "end", flexDirection: "column" }}
      slots={Object.entries<BuiltItem>(player?.abilities || {}).map(([slotKey, item]) => ({
        slotKey,
        item,
        icon: "./assets/icons/book.png",
      }))}
    />
  ),
  arePropsEqualWithKeys(["isOpen", "player.abilities", "player.activeItemSlots", "player.stats"]),
);

const GoldDisplay = ({ gold, sx }: { gold?: number; sx?: ThemeUIStyleObject }) => (
  <Flex sx={{ flex: 1, gap: 1, justifyContent: "end", alignItems: "center", ...sx }}>
    <Icon icon="./assets/icons/gold.png" size={16} />
    <Text>{gold || 0}</Text>
  </Flex>
);

export const MenuInventory = memo(
  ({ player, isOpen, setIsOpen, events }: CharacterMenuProps) => (
    <SlotMenu
      title="Inventory"
      icon="./assets/icons/bag.png"
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      location="inventory"
      player={player}
      events={events}
      slots={listSlots(MAX_INVENTORY_ITEMS, player?.inventory, "./assets/icons/bag.png")}
    >
      <GoldDisplay gold={player?.gold} sx={{ mt: 2 }} />
    </SlotMenu>
  ),
  arePropsEqualWithKeys(["isOpen", "player.inventory", "player.gold"]),
);

interface MenuBagProps extends Pick<CharacterMenuProps, "player" | "events"> {
  bagState: string[];
  toggleBagState: (id: string) => void;
}

/** One menu per open bag. */
export const MenuBag = memo(
  ({ bagState, player, toggleBagState, events }: MenuBagProps) =>
    bagState?.map((id) => {
      const bag = player?.inventory?.find((item: BuiltItem) => item?.id === id);
      const icon = `./assets/atlas/bag/${bag?.texture}.png`;
      return (
        <SlotMenu
          key={id}
          title={bag?.name}
          icon={icon}
          onClose={() => toggleBagState(id)}
          location="bag"
          bagId={bag?.id}
          player={player}
          events={events}
          slots={listSlots(bag?.space ?? 0, bag?.items, icon)}
        />
      );
    }),
  arePropsEqualWithKeys(["bagState", "player.inventory"]),
);
