import { Flex } from "@/ui";
import type { Cooldown } from "@/client/hud/app/context";
import { CooldownTimer } from "./cooldown-timer";
import { SkillButton } from "./skill-button";
import { useAppContext } from "@/client/hud/app/context";
import { memo } from "react";
import { arePropsEqualWithKeys } from "@/ui/are-props-equal";

export const SkillButtons = memo(
  ({ cooldowns }: { cooldowns: Record<string, Cooldown> }) => {
    const { showButtonChat } = useAppContext();

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
          iconName="handRight"
          onTouchStart={() => window.dispatchEvent(new CustomEvent("HERO_ATTACK_START"))}
          onTouchEnd={() => window.dispatchEvent(new CustomEvent("HERO_ATTACK"))}
          keyboardKey="SPACE"
        >
          <CooldownTimer cooldown={cooldowns["attack"]} />
        </SkillButton>
      </Flex>
    );
  },
  arePropsEqualWithKeys(["cooldowns"]),
);
