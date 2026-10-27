import { Tooltip as BaseTooltip } from "react-tooltip";
import { Portal } from "./portal";
import { theme } from "./theme";
import { useZoom } from "./zoom";
import { Flex } from "theme-ui";
import type { ComponentProps } from "react";

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

export const Tooltip = ({ children, style, ...props }: TooltipProps) => {
  const zoom = useZoom();
  const zoomed = zoom ? { fontSize: theme.fontSizes[1] * zoom } : {};
  return (
    <Portal container={document.body}>
      <BaseTooltip opacity={1} style={{ ...TOOLTIP_STYLE, ...zoomed, ...style }} {...props}>
        {children}
      </BaseTooltip>
    </Portal>
  );
};

/** The usual tooltip layout: a bold, centred column. */
export const TooltipContent = ({ sx, ...props }: ComponentProps<typeof Flex>) => (
  <Flex
    sx={{
      fontWeight: "bold",
      whiteSpace: "nowrap",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      textTransform: "capitalize",
      ...sx,
    }}
    {...props}
  />
);
