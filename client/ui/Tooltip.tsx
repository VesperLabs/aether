import { Tooltip as BaseTooltip, theme } from "@aether/ui";
import { useAppContext } from ".";

const Tooltip = ({ style, ...props }: any) => {
  const { zoom } = useAppContext();
  return <BaseTooltip {...props} style={{ ...style, fontSize: theme.fontSizes[1] * zoom }} />;
};

export default Tooltip;
