import { spellDetails, type BuiltItem, type SpellDefinition } from "@/shared/content";
import type { Cooldown, HudCharacter } from "@/client/hud/app/context";
import { CONSUMABLES_BASES, POTION_BASES } from "@/shared/rules/inventory";
import { applyTintToImage, loadCacheImage } from "@/ui/image-tint";
import { arePropsEqualWithKeys } from "@/ui/are-props-equal";
import { isMobile } from "@/ui/is-mobile";
import { CooldownTimer } from "./cooldown-timer";
import { ItemTooltip } from "@/client/hud/tooltips/item-tooltip";
import { SkillButton } from "./skill-button";
import { Box, Flex, Text } from "@/ui";
import React, { memo, useEffect, useState } from "react";

/** An entry of the hero's `abilities`: a spell or an item on the action bar. */
type AbilityItem = BuiltItem;
type Cooldowns = Record<string, Cooldown>;

interface TintedIconLoaderProps {
  cooldowns: Cooldowns;
  slotKey: string;
  item: AbilityItem;
  applyTintAndSetIcon: (item: AbilityItem) => Promise<string>;
  hero: HudCharacter;
}

const TintedIconLoader = ({
  cooldowns,
  slotKey,
  item,
  applyTintAndSetIcon,
  hero,
}: TintedIconLoaderProps) => {
  const isSpell = item.type === "spell";
  const isPotion = POTION_BASES.includes(item?.base);
  const isConsumable = CONSUMABLES_BASES.includes(item?.base);
  const details = spellDetails[item.base as keyof typeof spellDetails] as SpellDefinition | undefined;
  const cooldown = isPotion ? "potion" : item?.base;
  const [tintedIcon, setTintedIcon] = useState("./assets/icons/blank.png");
  const [hovering, setHovering] = useState(false);
  const tooltipId = `abilities-${item?.id}`;
  const showTooltip = !isMobile && hovering;

  useEffect(() => {
    const loadTintedIcon = async () => {
      const newTintedIcon = await applyTintAndSetIcon(item);
      setTintedIcon(newTintedIcon);
    };

    loadTintedIcon();
  }, [applyTintAndSetIcon, item]);

  const handleTouchEnd = () => {
    if (isConsumable) {
      return window.dispatchEvent(
        new CustomEvent("HERO_USE_ITEM", { detail: { item, location: "abilities" } }),
      );
    }
    if (details?.isMeleeAttack) {
      return window.dispatchEvent(new CustomEvent("HERO_ATTACK"));
    }
    return window.dispatchEvent(new CustomEvent("HERO_ABILITY", { detail: slotKey }));
  };

  const handleTouchStart = () => {
    if (details?.isMeleeAttack) {
      return window.dispatchEvent(new CustomEvent("HERO_ATTACK_START", { detail: slotKey }));
    }
    return window.dispatchEvent(new CustomEvent("HERO_AIM_START", { detail: slotKey }));
  };

  return (
    <Box
      data-tooltip-id={tooltipId}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      sx={{
        position: "relative",
        display: "inline-block",
        pointerEvents: "all",
      }}
    >
      <SkillButton
        key={slotKey}
        size={16}
        icon={tintedIcon}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        keyboardKey={slotKey}
        sx={{
          "& > .icon": {
            mt: "-6px",
            mb: "6px",
          },
        }}
      >
        <CooldownTimer cooldown={cooldowns["global"]} />
        <CooldownTimer cooldown={cooldowns[cooldown]} />
        {details?.isMeleeAttack && <CooldownTimer cooldown={cooldowns["attack"]} />}
        <Text
          sx={{
            bottom: "13px",
            left: 0,
            position: "absolute",
            fontSize: 0,
            textAlign: "center",
            width: "100%",
          }}
        >
          {isSpell ? `Lv. ${item?.ilvl}` : item?.amount}
        </Text>
      </SkillButton>
      <ItemTooltip player={hero} item={item} show={showTooltip} tooltipId={tooltipId} />
    </Box>
  );
};

export const AbilityButtons = memo(
  ({ hero, cooldowns }: { hero: HudCharacter; cooldowns: Cooldowns }) => {
    const abilities = Object.entries((hero?.abilities || {}) as Record<string, AbilityItem | null>).filter(([slotKey, _]) =>
      hero.activeItemSlots.includes(slotKey),
    );

    const applyTintAndSetIcon = async (item: AbilityItem) => {
      const isSpell = item.type === "spell";
      const texture = !isSpell ? item?.texture : "spell-" + item.base;
      const iconURL = `./assets/atlas/${item?.type}/${texture}.png`;

      if (item?.tint && iconURL) {
        try {
          const image = await loadCacheImage(iconURL);
          const tintedCanvas = applyTintToImage(image, item?.tint); // Replace "0xFF0000" with the desired tint color
          return tintedCanvas ? tintedCanvas.toDataURL("image/png") : iconURL;
        } catch (error) {
          console.error("Error applying tint to icon:", error);
          return iconURL;
        }
      }

      return iconURL;
    };

    return (
      <Flex
        sx={{
          flexDirection: "column",
          gap: 2,
          px: 1,
          justifyContent: "end",
          alignItems: "flex-end",
        }}
      >
        {abilities.map(([slotKey, item]) => (
          <React.Fragment key={slotKey}>
            {item && (
              <TintedIconLoader
                cooldowns={cooldowns}
                slotKey={slotKey}
                item={item}
                applyTintAndSetIcon={applyTintAndSetIcon}
                hero={hero}
              />
            )}
          </React.Fragment>
        ))}
      </Flex>
    );
  },
  arePropsEqualWithKeys([
    "hero.abilities",
    "cooldowns",
    "hero.activeItemSlots",
    "hero.stats",
    "hero.state",
  ]),
);
