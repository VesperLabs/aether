import { Tooltip as BaseTooltip } from "react-tooltip";

const TOOLTIP_STYLE = {
  opacity: 1,
  transition: "none",
  padding: 12,
  borderRadius: 5,
  zIndex: 8888,
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
    <BaseTooltip style={{ ...TOOLTIP_STYLE, ...style }} {...props}>
      {children}
    </BaseTooltip>
  );
};

export default Tooltip;
