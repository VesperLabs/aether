import { Tooltip as BaseTooltip } from "react-tooltip";
import Portal from "./Portal";
import theme from "./theme";

const TOOLTIP_STYLE = {
  transition: "none",
  padding: 12,
  borderRadius: 5,
  zIndex: theme.zIndices.tooltip,
  backgroundColor: "rgba(0,0,0,.95)",
  width: "max-content",
  zoom: 1,
};

interface TooltipProps {
  children?: React.ReactNode;
  id?: string;
  style?: object;
  isOpen?: boolean;
}

const Tooltip = ({ children, style, ...props }: TooltipProps) => {
  return (
    <Portal container={document.body}>
      <BaseTooltip opacity={1} style={{ ...TOOLTIP_STYLE, ...style }} {...props}>
        {children}
      </BaseTooltip>
    </Portal>
  );
};

export default Tooltip;
