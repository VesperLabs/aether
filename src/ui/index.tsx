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
export { theme } from "./theme";
export { Button } from "./button/button";
export { Icon } from "./icon";
export { KeyboardKey } from "./keyboard-key";
export { Modal } from "./modal";
export { Input } from "./input";
export { KeyboardButton } from "./keyboard-button";
export { Tooltip } from "./tooltip";
export { Portal } from "./portal";
export { Switch } from "./switch";
export { PlayerRender, PLAYER_RENDER_CANVAS_STYLE, FULL_CANVAS_SIZE } from "./player-render";
export { Menu, MenuHeader, MENU_MAX_WIDTH } from "./menu";
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
