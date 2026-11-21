import { Box, Flex, isMobile, ItemTooltip } from "@/ui";
import { filterVisibleEquipment } from "@/rules/character";
import type { Cooldown } from "@/client/hud/app/context";
import { CooldownTimer } from "./cooldown-timer";
import { canAffordCosts } from "@/rules/combat";
import { SkillButton } from "./skill-button";
import { useNextAttack } from "./use-next-attack-sp-cost";
import { resolveAsset } from "@/content";
import { useAssetArt } from "@/ui";
import { DODGE_SP_COST } from "@/rules/movement";
import { useAppContext } from "@/client/hud/app/context";
import { memo, useState } from "react";
import { arePropsEqualWithKeys } from "@/ui";
import { useKeyFor } from "@/client/hud/settings/use-key-bindings";

export const SkillButtons = memo(
  ({ cooldowns }: { cooldowns: Record<string, Cooldown> }) => {
    const { showButtonChat, hero } = useAppContext();
    const { hand: attackHand, spCost: attackSpCost } = useNextAttack(hero);
    /* Hovering the attack button shows the weapon the next swing uses */
    const [hoveringAttack, setHoveringAttack] = useState(false);
    const hands = filterVisibleEquipment(hero ?? {});
    const attackWeapon = hands?.[attackHand];
    /* Both hands' art stays loaded, so a dual-wielder's swap between swings never shows a blank */
    const assetUser = { profile: hero?.profile ?? {} };
    const rightArt = useAssetArt(
      hands?.handRight ? resolveAsset(hands.handRight, assetUser) : undefined,
      hands?.handRight?.tint,
    );
    const leftArt = useAssetArt(
      hands?.handLeft ? resolveAsset(hands.handLeft, assetUser) : undefined,
      hands?.handLeft?.tint,
    );
    /* The next swing's weapon stands in for the hand, facing the hand that holds it */
    const attackWeaponIcon = attackWeapon
      ? attackHand === "handLeft"
        ? leftArt
        : rightArt
      : undefined;
    const keys = {
      talk: useKeyFor("talk"),
      dodge: useKeyFor("dodge"),
      grab: useKeyFor("grab"),
      attack: useKeyFor("attack"),
    };

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
          keyboardKey={keys.talk}
          sx={{ opacity: showButtonChat ? 1 : 0.5 }}
        />
        <SkillButton
          size={16}
          iconName="boots"
          onTouchStart={() => window.dispatchEvent(new Event("HERO_DODGE_START"))}
          onTouchEnd={() => window.dispatchEvent(new Event("HERO_DODGE"))}
          keyboardKey={keys.dodge}
          costs={{ sp: DODGE_SP_COST }}
          disabled={!canAffordCosts(hero?.stats, { sp: DODGE_SP_COST })}
        >
          <CooldownTimer cooldown={cooldowns["dodge"]} />
        </SkillButton>
        <SkillButton
          size={16}
          iconName="grab"
          onTouchEnd={() => window.dispatchEvent(new CustomEvent("HERO_GRAB"))}
          keyboardKey={keys.grab}
        />
        <Box
          data-tooltip-id="attack-button"
          onMouseEnter={() => setHoveringAttack(true)}
          onMouseLeave={() => setHoveringAttack(false)}
          sx={{ position: "relative", display: "inline-block", pointerEvents: "all" }}
        >
          <SkillButton
            size={16}
            iconName="handRight"
            icon={attackWeaponIcon}
            onTouchStart={() => window.dispatchEvent(new CustomEvent("HERO_ATTACK_START"))}
            onTouchEnd={() => window.dispatchEvent(new CustomEvent("HERO_ATTACK"))}
            keyboardKey={keys.attack}
            costs={{ sp: attackSpCost }}
            sx={{
              "& > .icon": {
                transform: attackHand === "handLeft" ? "scaleX(-1)" : "none",
                /* Long weapons outgrow the icon box: the box spans the whole button instead */
                ...(attackWeaponIcon && { width: 64, height: 64, m: "-16px" }),
              },
            }}
          >
            <CooldownTimer cooldown={cooldowns["attack"]} />
          </SkillButton>
          {attackWeapon && (
            <ItemTooltip
              player={hero}
              item={attackWeapon}
              show={!isMobile && hoveringAttack}
              tooltipId="attack-button"
            />
          )}
        </Box>
      </Flex>
    );
  },
  arePropsEqualWithKeys(["cooldowns"]),
);
