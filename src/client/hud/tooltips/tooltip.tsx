import type { ComponentProps } from "react";
import { Tooltip as BaseTooltip, theme } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";

export const Tooltip = ({ style, ...props }: ComponentProps<typeof BaseTooltip>) => {
  const { zoom = 1.25 } = useAppContext();
  return <BaseTooltip {...props} style={{ ...style, fontSize: theme.fontSizes[1] * Number(zoom) }} />;
};
