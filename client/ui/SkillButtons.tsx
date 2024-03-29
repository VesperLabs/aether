import { Flex } from "@aether/ui";
import { CooldownTimer, SkillButton, useAppContext } from "./";
import { memo } from "react";
import { arePropsEqualWithKeys } from "@aether/shared";

const SkillButtons = memo(({ cooldowns }: any) => {
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
}, arePropsEqualWithKeys(["cooldowns"]));

export default SkillButtons;
