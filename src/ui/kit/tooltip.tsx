import { flip, offset, shift, type Middleware } from "@floating-ui/dom";
import { Tooltip as BaseTooltip } from "react-tooltip";
import { Portal } from "./portal";
import { theme } from "./theme";
import { useZoom } from "./zoom";
import { Flex } from "theme-ui";
import type { ComponentProps } from "react";

const TOOLTIP_STYLE = {
  transition: "none",
  /* react-tooltip pads its inner content element itself */
  padding: 0,
  borderRadius: 5,
  zIndex: theme.zIndices.tooltip,
  backgroundColor: "rgba(0,0,0,.95)",
  width: "max-content",
  zoom: 1,
};

/**
 * Hides the tooltip while its anchor has no size. react-tooltip re-places a tooltip whenever its
 * anchor resizes (floating-ui's `autoUpdate`), and one hidden by its menu closing measures as a
 * zero box at the page's corner: the tooltip would flash there before it closes.
 */
function hideWithoutAnchor(): Middleware {
  return {
    name: "hideWithoutAnchor",
    fn({ rects, elements }) {
      const gone = rects.reference.width === 0 && rects.reference.height === 0;
      elements.floating.style.visibility = gone ? "hidden" : "";
      return {};
    },
  };
}

/* Above or below only, as a tooltip beside its target blocks the way to the slot next to it. One
   that fits neither way is pushed back on screen rather than flipped sideways. */
const PLACEMENT = [
  offset(6),
  flip({ fallbackPlacements: ["top", "bottom"] }),
  shift({ padding: 5, crossAxis: true }),
  hideWithoutAnchor(),
];

interface TooltipProps {
  children?: React.ReactNode;
  id?: string;
  style?: object;
  isOpen?: boolean;
  /** A CSS border; react-tooltip draws it (round the arrow too) and ignores one in `style`. */
  border?: string;
}

export const Tooltip = ({ children, style, ...props }: TooltipProps) => {
  const zoom = useZoom();
  const zoomed = zoom ? { fontSize: theme.fontSizes[1] * zoom } : {};
  return (
    <Portal container={document.body}>
      <BaseTooltip
        opacity={1}
        middlewares={PLACEMENT}
        style={{ ...TOOLTIP_STYLE, ...zoomed, ...style }}
        {...props}
      >
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
