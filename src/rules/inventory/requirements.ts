import { hasVisibleWeaponType } from "@/rules/combat";
import { filterVisibleEquipment } from "@/rules/character";
import type { InventoryItem } from "./types";

interface RequirementPlayer {
  charClass?: string;
  stats?: Record<string, number>;
  equipment?: Record<string, InventoryItem>;
  activeItemSlots?: string[];
  profile?: { race?: string } | null;
}

export function itemHasRequiredStats({
  requirements,
  player,
  key,
}: {
  requirements: Record<string, any>;
  player?: RequirementPlayer;
  key: string;
}) {
  const playerStat = player?.stats?.[key];
  const requiredStat = requirements[key];

  if (key === "charClass") {
    return player?.charClass === requiredStat;
  }

  if (key === "weaponType") {
    return hasVisibleWeaponType(
      { ...player, visibleEquipment: filterVisibleEquipment(player ?? {}) },
      "melee",
    );
  }

  return (playerStat as number) >= requiredStat;
}
