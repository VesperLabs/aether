import { POTION_BASES, applyTintToImage, loadCacheImage } from "@aether/shared";
import { CooldownTimer, SkillButton, useAppContext } from "./";
import { Flex, Text } from "@aether/ui";
import React, { useEffect, useState } from "react";

const TintedIconLoader = ({ slotKey, item, applyTintAndSetIcon }) => {
  const isSpell = item.type === "spell";
  const cooldown = POTION_BASES.includes(item?.base) ? "potion" : item?.base;
  const [tintedIcon, setTintedIcon] = useState("./assets/icons/blank.png");

  useEffect(() => {
    const loadTintedIcon = async () => {
      const newTintedIcon = await applyTintAndSetIcon(item);
      setTintedIcon(newTintedIcon);
    };

    loadTintedIcon();
  }, [applyTintAndSetIcon, item]);

  return (
    <SkillButton
      key={slotKey}
      size={16}
      icon={tintedIcon}
      onTouchStart={() =>
        window.dispatchEvent(new CustomEvent("HERO_AIM_START", { detail: slotKey }))
      }
      onTouchEnd={() => window.dispatchEvent(new CustomEvent("HERO_ABILITY", { detail: slotKey }))}
      keyboardKey={slotKey}
      sx={{
        "& > .icon": {
          mt: "-6px",
          mb: "6px",
        },
      }}
    >
      <CooldownTimer cooldown={"global"} />
      <CooldownTimer cooldown={cooldown} color="set" />
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
  );
};

const AbilityButtons = () => {
  const { hero } = useAppContext();
  const abilities = Object.entries(hero?.abilities || {}).filter(([slotKey, _]) =>
    hero.activeItemSlots.includes(slotKey)
  );

  const applyTintAndSetIcon = async (item) => {
    const isSpell = item.type === "spell";
    const texture = !isSpell ? item?.texture : "spell-" + item.base;
    const iconURL = `./assets/atlas/${item?.type}/${texture}.png`;

    if (item?.tint && iconURL) {
      try {
        const image = await loadCacheImage(iconURL);
        const tintedCanvas = applyTintToImage(image, item?.tint); // Replace "0xFF0000" with the desired tint color
        return tintedCanvas.toDataURL("image/png");
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
              slotKey={slotKey}
              item={item}
              applyTintAndSetIcon={applyTintAndSetIcon}
            />
          )}
        </React.Fragment>
      ))}
    </Flex>
  );
};

export default AbilityButtons;
