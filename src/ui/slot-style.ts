import type { ThemeUIStyleObject } from "theme-ui";
import type { theme } from "./theme";

type AppTheme = typeof theme;

export const SLOT_SIZE = 56;
export const BASE_SLOT_STYLE = {
  width: SLOT_SIZE,
  height: SLOT_SIZE,
  borderRadius: 2,
  border: (t: AppTheme) => `1px solid ${t.colors.shadow[50]}`,
  backgroundColor: (t: AppTheme) => `${t.colors.shadow[30]}`,
  "& > *": {
    imageRendering: "pixelated",
  },
} as ThemeUIStyleObject;

export const STYLE_SLOT_EMPTY = (icon: string | undefined) => ({
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
    background: (t: AppTheme) =>
      `radial-gradient(circle, ${t.colors[color as keyof AppTheme["colors"]]} 0%, ${t.colors.shadow[50]} 150%)`,
  } as ThemeUIStyleObject;
};
