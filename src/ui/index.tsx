import { ThemeUIStyleObject } from "theme-ui";
export {
  ThemeUIProvider,
  Box,
  Flex,
  Badge,
  Field,
  Grid,
  Text,
  Spinner,
  Card,
  Divider,
  Donut,
  Link,
} from "theme-ui";
export { default as theme } from "./theme";
export { default as Button } from "./button/button";
export { default as Icon } from "./icon";
export { default as KeyboardKey } from "./keyboard-key";
export { default as Modal } from "./modal";
export { default as Input } from "./input";
export { default as KeyboardButton } from "./keyboard-button";
export { default as Tooltip } from "./tooltip";
export { default as Portal } from "./portal";
export { default as Switch } from "./switch";
export {
  default as PlayerRender,
  PLAYER_RENDER_CANVAS_STYLE,
  FULL_CANVAS_SIZE,
} from "./player-render";
export * from "./hooks";

export const SLOT_SIZE = 56;
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
