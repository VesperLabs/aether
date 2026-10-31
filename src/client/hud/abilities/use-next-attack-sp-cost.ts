import { useEffect, useState } from "react";
import { getAttackSpCost, getNextAttackCount } from "@/rules/combat";
import { filterVisibleEquipment } from "@/rules/character";
import type { HudCharacter } from "@/client/hud/app/context";

/** SP the hero's next swing costs: dual-wielders alternate hands, each with its own cost. */
export function useNextAttackSpCost(hero: HudCharacter | null | undefined) {
  const [lastAttackCount, setLastAttackCount] = useState<number>();

  useEffect(() => {
    const onAttack = (e: WindowEventMap["HERO_ATTACK_COUNT"]) => setLastAttackCount(e.detail);
    window.addEventListener("HERO_ATTACK_COUNT", onAttack);
    return () => window.removeEventListener("HERO_ATTACK_COUNT", onAttack);
  }, []);

  const visibleEquipment = filterVisibleEquipment(hero ?? {});
  const count = getNextAttackCount(lastAttackCount, {
    profile: hero?.profile ?? {},
    visibleEquipment,
  });
  return getAttackSpCost(visibleEquipment, count);
}
