import { Tooltip as BaseTooltip, theme } from "@/ui";
import { useAppContext } from "@/client/hud/app/app";

export const Tooltip = ({ style, ...props }: any) => {
  const { zoom = 1.25 } = useAppContext();
  return <BaseTooltip {...props} style={{ ...style, fontSize: theme.fontSizes[1] * zoom }} />;
};
