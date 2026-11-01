import { useEffect, useState } from "react";
import { getAttackSpCost, getNextAttackCount, type Hand } from "@/rules/combat";
import { filterVisibleEquipment } from "@/rules/character";
import type { HudCharacter } from "@/client/hud/app/context";

/** The hero's next swing: dual-wielders alternate hands, each with its own SP cost. */
export function useNextAttack(hero: HudCharacter | null | undefined) {
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
  /* Count 1 is the right hand, or the left when only the left holds something */
  const hand: Hand =
    count === 2 || (!visibleEquipment?.handRight && visibleEquipment?.handLeft)
      ? "handLeft"
      : "handRight";
  return { hand, spCost: getAttackSpCost(visibleEquipment, count) };
}

/** SP the hero's next swing costs. */
export function useNextAttackSpCost(hero: HudCharacter | null | undefined) {
  return useNextAttack(hero).spCost;
}
