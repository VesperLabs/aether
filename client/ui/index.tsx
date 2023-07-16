import { ThemeUIStyleObject } from "theme-ui";
export { theme } from "@aether/ui";
export { default as Slot } from "./Slot";
export { default as ItemTooltip } from "./ItemTooltip";
export { default as MenuEquipment } from "./MenuEquipment";
export { default as MenuInventory } from "./MenuInventory";
export { default as Portrait } from "./Portrait";
export { default as MenuKeeper } from "./MenuKeeper";
export { default as MenuProfile } from "./MenuProfile";
export { default as MenuBag } from "./MenuBag";
export { default as MenuHud } from "./MenuHud";
export { default as MenuStats } from "./MenuStats";
export { default as ModalRespawn } from "./ModalRespawn";
export { default as ModalLogin } from "./ModalLogin";
export { default as ModalDropAmount } from "./ModalDropAmount";
export { default as MessageBox } from "./MessageBox";
export { default as MenuButton } from "./MenuButton";
export { default as MenuHeader } from "./MenuHeader";
export { default as MenuSocial } from "./MenuSocial";
export { default as MenuQuests } from "./MenuQuests";
export { default as SlotAmount } from "./SlotAmount";
export { default as MenuAbilities } from "./MenuAbilities";
export { default as Quest } from "./Quest";
export { default as QuestTooltip } from "./QuestTooltip";
export { default as SkillButton } from "./SkillButton";
export { default as Menu } from "./Menu";
export { useAppContext } from "./App";

export const MENU_MAX_WIDTH = 1024;

export const SLOT_SIZE = 56;

export const ICONS = {
  WARRIOR: `../assets/icons/axe.png`,
  ROGUE: `../assets/icons/katar.png`,
  MAGE: `../assets/icons/rod.png`,
  CLERIC: `../assets/icons/staff.png`,
};

export const BASE_SLOT_STYLE = {
  width: SLOT_SIZE,
  height: SLOT_SIZE,
  borderRadius: 2,
  border: (t) => `1px solid ${t.colors.shadow[50]}`,
  backgroundColor: (t) => `${t.colors.shadow[30]}`,
  "& > *": {
    imageRendering: "pixelated",
  },
} as ThemeUIStyleObject;

export const STYLE_SLOT_EMPTY = (icon) => ({
  ...BASE_SLOT_STYLE,
  filter: "grayscale(100%)",
  backgroundImage: `url(${icon})`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  opacity: 0.5,
});

export const STYLE_NON_EMPTY = ({
  rarity,
  isActive = true,
}: {
  rarity: string;
  isActive?: boolean;
}) => {
  const color = isActive ? rarity : "danger";
  return {
    ...BASE_SLOT_STYLE,
    borderColor: color,
    background: (t) =>
      `radial-gradient(circle, ${t.colors[color]} 0%, ${t.colors.shadow[50]} 150%)`,
  } as ThemeUIStyleObject;
};

export const HUD_CONTAINER_ID = "hud-container";

export const BLANK_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
