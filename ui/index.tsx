import { ThemeUIStyleObject } from "theme-ui";
export {
  ThemeProvider,
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
export { default as Button } from "./Button/Button";
export { default as Icon } from "./Icon";
export { default as KeyboardKey } from "./KeyboardKey";
export { default as Modal } from "./Modal";
export { default as Input } from "./Input";
export { default as KeyboardButton } from "./KeyboardButton";
export { default as Tooltip } from "./Tooltip";
export { default as Portal } from "./Portal";
export {
  default as PlayerRender,
  PLAYER_RENDER_CANVAS_STYLE,
  FULL_CANVAS_SIZE,
} from "./PlayerRender";
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
