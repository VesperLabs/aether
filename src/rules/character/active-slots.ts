import { ItemBuilder } from "@/content";
import { addBuffBonuses, type ActiveBuff } from "@/rules/buffs";
import { hasAttackableWeapons, hasVisibleWeaponType } from "@/rules/combat";

/** The requirements an item can have that the character's own stats must meet. */
const STAT_REQUIREMENTS = [
  "vitality",
  "dexterity",
  "strength",
  "intelligence",
  "level",
  "charClass",
];

type SlotItem = Record<string, any> | null | undefined;
type SlottedItem = Record<string, any> & { slotKey: string };

/** What decides which worn items work: the items, the stats they need, and the wearer. */
export interface ActiveSlotsInput {
  equipment?: Record<string, SlotItem>;
  abilities?: Record<string, SlotItem>;
  buffs?: ActiveBuff[];
  baseStats?: Record<string, any>;
  charClass?: string;
  profile?: { race?: string } | null;
}

/**
 * The equipment and ability slots whose items work: the character meets their requirements and
 * can hold them together. Items in other slots are worn but give nothing and are not drawn.
 * Stats from working items count towards the next item's requirements, cheapest first, and so do
 * finished sets.
 */
export function getActiveItemSlots(character: ActiveSlotsInput): string[] {
  const { equipment = {}, abilities = {}, buffs = [] } = character;
  const zeros = () => Object.fromEntries(STAT_REQUIREMENTS.map((stat) => [stat, 0]));
  const { baseStats, percentStats } = addBuffBonuses(
    buffs,
    { ...zeros(), ...character.baseStats },
    zeros(),
  );
  const allItems: SlottedItem[] = Object.entries({ ...equipment, ...abilities }).map(
    ([slotKey, item]) => ({ ...item, slotKey }),
  );
  let active = allItems.map((item) => item.slotKey);
  const drop = (slotKey: string) => {
    active = active.filter((slot) => slot !== slotKey);
  };

  if (!hasAttackableWeapons(character, "equipment")) {
    drop("handLeft");
    drop("handRight");
  }

  const setItems = new Map<string, SlotItem>();
  for (const key of STAT_REQUIREMENTS) {
    const worn = allItems
      .filter((item) => active.includes(item.slotKey))
      .sort((a, b) => (a.requirements?.[key] ?? 0) - (b.requirements?.[key] ?? 0));

    for (const item of worn) {
      const requirement = item.requirements?.[key];
      if (key === "charClass" && requirement && character.charClass !== requirement) {
        drop(item.slotKey);
        continue;
      }
      const percent = (percentStats[key] ?? 0) / 100;
      if (requirement > baseStats[key] + Math.floor(baseStats[key] * percent)) {
        drop(item.slotKey);
        continue;
      }
      if (item.stats?.[key]) baseStats[key] += item.stats[key];
      if (item.percentStats?.[key]) percentStats[key] += item.percentStats[key];
      if (item.setName) {
        setItems.set(item.id, item);
        const setInfo = ItemBuilder.getSetInfo(item.setName);
        const pieces = [...setItems.values()].filter((i) => i?.setName === item.setName);
        if (pieces.length >= setInfo?.pieces) {
          if (setInfo?.stats?.[key]) baseStats[key] += setInfo.stats[key];
          if (setInfo?.percentStats?.[key]) percentStats[key] += setInfo.percentStats[key];
        }
      }
    }
  }

  /* Melee skills need a melee weapon in a hand that works */
  const visible = {
    ...character,
    visibleEquipment: Object.fromEntries(
      Object.entries(equipment).filter(([slot]) => active.includes(slot)),
    ),
  };
  for (const item of allItems.filter((i) => active.includes(i.slotKey))) {
    const weaponType = item.requirements?.weaponType;
    if (weaponType && !hasVisibleWeaponType(visible, weaponType)) drop(item.slotKey);
  }

  return active;
}
