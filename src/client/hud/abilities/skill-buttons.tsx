import { Flex } from "@/ui";
import type { Cooldown } from "@/client/hud/app/context";
import { CooldownTimer } from "./cooldown-timer";
import { canAffordCosts } from "@/rules/combat";
import { SkillButton } from "./skill-button";
import { useNextAttack } from "./use-next-attack-sp-cost";
import { DODGE_SP_COST } from "@/rules/movement";
import { useAppContext } from "@/client/hud/app/context";
import { memo } from "react";
import { arePropsEqualWithKeys } from "@/ui";

export const SkillButtons = memo(
  ({ cooldowns }: { cooldowns: Record<string, Cooldown> }) => {
    const { showButtonChat, hero } = useAppContext();
    const { hand: attackHand, spCost: attackSpCost } = useNextAttack(hero);

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
          iconName="boots"
          onTouchStart={() => window.dispatchEvent(new Event("HERO_DODGE_START"))}
          onTouchEnd={() => window.dispatchEvent(new Event("HERO_DODGE"))}
          keyboardKey="SHIFT"
          costs={{ sp: DODGE_SP_COST }}
          disabled={!canAffordCosts(hero?.stats, { sp: DODGE_SP_COST })}
        >
          <CooldownTimer cooldown={cooldowns["dodge"]} />
        </SkillButton>
        <SkillButton
          size={16}
          iconName="grab"
          onTouchEnd={() => window.dispatchEvent(new CustomEvent("HERO_GRAB"))}
          keyboardKey="F"
        />
        <SkillButton
          size={16}
          iconName="handRight"
          onTouchStart={() => window.dispatchEvent(new CustomEvent("HERO_ATTACK_START"))}
          onTouchEnd={() => window.dispatchEvent(new CustomEvent("HERO_ATTACK"))}
          keyboardKey="SPACE"
          costs={{ sp: attackSpCost }}
          disabled={!canAffordCosts(hero?.stats, { sp: attackSpCost })}
          sx={{ "& > .icon": { transform: attackHand === "handLeft" ? "scaleX(-1)" : "none" } }}
        >
          <CooldownTimer cooldown={cooldowns["attack"]} />
        </SkillButton>
      </Flex>
    );
  },
  arePropsEqualWithKeys(["cooldowns"]),
);
