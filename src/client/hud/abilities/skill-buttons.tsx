import { Flex } from "@/ui";
import type { Cooldown } from "@/client/hud/app/context";
import { COOLING_DOWN_OPACITY, CooldownTimer, useIsCoolingDown } from "./cooldown-timer";
import { SkillButton } from "./skill-button";
import { getAttackSpCost } from "@/rules/combat";
import { filterVisibleEquipment } from "@/rules/character";
import { DODGE_SP_COST } from "@/rules/movement";
import { useAppContext } from "@/client/hud/app/context";
import { memo } from "react";
import { arePropsEqualWithKeys } from "@/ui";

export const SkillButtons = memo(
  ({ cooldowns }: { cooldowns: Record<string, Cooldown> }) => {
    const { showButtonChat, hero } = useAppContext();
    const attackSpCost = getAttackSpCost(filterVisibleEquipment(hero), 1);
    const isDodgeCooling = useIsCoolingDown(cooldowns["dodge"]);
    const isAttackCooling = useIsCoolingDown(cooldowns["attack"]);

    return (
      <Flex
        sx={{
          gap: 2,
          p: 1,
          py: 2,
          justifyContent: "end",
          alignItems: "flex-end",
        }}
      >
        <SkillButton
          size={16}
          iconName="chat"
          onTouchEnd={() => window.dispatchEvent(new CustomEvent("HERO_CHAT_NPC"))}
          keyboardKey="X"
          sx={{ opacity: showButtonChat ? 1 : 0.5 }}
        />
        <SkillButton
          size={16}
          iconName="grab"
          onTouchEnd={() => window.dispatchEvent(new CustomEvent("HERO_GRAB"))}
          keyboardKey="F"
        />
        <SkillButton
          size={16}
          iconName="boots"
          onTouchStart={() => window.dispatchEvent(new Event("HERO_DODGE_START"))}
          onTouchEnd={() => window.dispatchEvent(new Event("HERO_DODGE"))}
          keyboardKey="SHIFT"
          costs={{ sp: DODGE_SP_COST }}
          sx={{ opacity: isDodgeCooling ? COOLING_DOWN_OPACITY : 1 }}
        >
          <CooldownTimer cooldown={cooldowns["dodge"]} />
        </SkillButton>
        <SkillButton
          size={16}
          iconName="handRight"
          onTouchStart={() => window.dispatchEvent(new CustomEvent("HERO_ATTACK_START"))}
          onTouchEnd={() => window.dispatchEvent(new CustomEvent("HERO_ATTACK"))}
          keyboardKey="SPACE"
          costs={{ sp: attackSpCost }}
          sx={{ opacity: isAttackCooling ? COOLING_DOWN_OPACITY : 1 }}
        >
          <CooldownTimer cooldown={cooldowns["attack"]} />
        </SkillButton>
      </Flex>
    );
  },
  arePropsEqualWithKeys(["cooldowns"]),
);
