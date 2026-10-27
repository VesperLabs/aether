import type { ReactNode } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { Text } from "theme-ui";
import { theme } from "./theme";

/** Converts a hex colour to rgba. */
const hexToRGBA = (hex: string, alpha = 1) => {
  let r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);

  if (alpha > 1) alpha = 1;
  if (alpha < 0) alpha = 0;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Looks up a dotted path such as "gray.500" in the theme colors. */
const resolveThemeColor = (path: string): string | undefined => {
  let node: unknown = theme.colors;
  for (const key of path.split(".")) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node as string | undefined;
};

export const TextDivider = ({
  children,
  sx,
  color = "gray.500",
  alpha = 0.5,
}: {
  children?: ReactNode;
  sx?: ThemeUIStyleObject;
  color?: string;
  alpha?: number;
}) => {
  const resolvedColor = resolveThemeColor(color) ?? color;
  const colorWithAlpha = hexToRGBA(resolvedColor, alpha);

  return (
    <Text
      sx={{
        py: 2,
        color,
        position: "relative",
        display: "block",
        width: "100%",
        textAlign: "center",
        backgroundImage: `linear-gradient(to bottom, transparent 50%, ${colorWithAlpha} 50%, ${colorWithAlpha} 52%, transparent 52%)`,
        backgroundPosition: "center",
        ...sx,
      }}
    >
      {children}
    </Text>
  );
};
