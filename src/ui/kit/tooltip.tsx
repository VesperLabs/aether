import {
  arrow,
  autoUpdate,
  flip,
  hide,
  offset,
  shift,
  useFloating,
  type Placement,
} from "@floating-ui/react-dom";
import { useCallback, useId, useState, type ComponentProps, type ReactNode } from "react";
import { Flex } from "theme-ui";
import { Portal } from "./portal";
import { theme } from "./theme";
import { useZoom } from "./zoom";
import { useHoveredAnchor, useOpenAnchor, useShownAlone } from "./tooltip-anchor";

const TOOLTIP_STYLE = {
  position: "fixed",
  /* Text only, unless a tooltip with buttons or slots asks for the pointer */
  pointerEvents: "none",
  borderRadius: 5,
  zIndex: theme.zIndices.tooltip,
  backgroundColor: "rgba(0,0,0,.95)",
  color: "#fff",
  fontSize: "90%",
  width: "max-content",
} as const;

const CONTENT_STYLE = {
  position: "relative",
  zIndex: 1,
  padding: "8px 16px",
  background: "inherit",
  borderRadius: "inherit",
} as const;

const ARROW_SIZE = 8;

/*
 * Above or below only, as a tooltip beside its target blocks the way to the slot next to it. One
 * that fits neither way is pushed back on screen rather than flipped sideways.
 */
const placement = (arrowElement: HTMLElement | null) => [
  offset(6),
  flip({ fallbackPlacements: ["top", "bottom"] }),
  shift({ padding: 5, crossAxis: true }),
  arrow({ element: arrowElement, padding: 4 }),
  hide(),
];

interface TooltipProps {
  children?: ReactNode;
  /** Opens at whatever carries this `data-tooltip-id`; its `data-tooltip-content` is the text when there are no children. */
  id?: string;
  style?: object;
  /** Opened and closed by its owner; omit to open while an anchor is hovered. */
  isOpen?: boolean;
  /** A CSS border, such as an item's gilding. */
  border?: string;
}

/**
 * A tooltip over an anchor, placed by Floating UI. It opens and closes the moment it's told, and
 * opening it closes any other tooltip it doesn't sit inside.
 */
export const Tooltip = ({ children, id, style, isOpen, border }: TooltipProps) => {
  const zoom = useZoom();
  const controlled = isOpen !== undefined;
  const openAnchor = useOpenAnchor(id, isOpen);
  const hoveredAnchor = useHoveredAnchor(id, !controlled);
  const anchor = controlled ? openAnchor : hoveredAnchor;
  const [arrowEl, setArrowEl] = useState<HTMLDivElement | null>(null);
  const [floatingEl, setFloatingEl] = useState<HTMLDivElement | null>(null);
  const {
    floatingStyles,
    middlewareData,
    placement: side,
  } = useFloating({
    elements: { reference: anchor, floating: floatingEl },
    placement: (anchor?.getAttribute("data-tooltip-place") as Placement | null) ?? "top",
    strategy: "fixed",
    middleware: placement(arrowEl),
    whileElementsMounted: autoUpdate,
  });
  const key = useId();
  const floating = useCallback(() => floatingEl, [floatingEl]);
  const alone = useShownAlone(key, !!anchor, anchor, floating);
  if (!anchor || !alone) return null;
  const content = children ?? anchor.getAttribute("data-tooltip-content");
  if (content == null || content === "") return null;
  /* An anchor that's gone (its menu closed) measures as a zero box at the corner: don't flash there */
  const gone = middlewareData.hide?.referenceHidden || isCollapsed(anchor);
  return (
    <Portal container={document.body}>
      <div
        ref={setFloatingEl}
        role="tooltip"
        style={{
          ...TOOLTIP_STYLE,
          ...(zoom ? { fontSize: theme.fontSizes[1] * zoom } : {}),
          ...(border ? { border } : {}),
          ...floatingStyles,
          ...style,
          visibility: gone ? "hidden" : "visible",
        }}
      >
        <div style={CONTENT_STYLE}>{content}</div>
        <Arrow
          ref={setArrowEl}
          below={side.startsWith("bottom")}
          x={middlewareData.arrow?.x}
          border={border}
        />
      </div>
    </Portal>
  );
};

/** The point toward the anchor: a square turned on its corner, edged like the tooltip on its two outer sides. */
const Arrow = ({
  ref,
  below,
  x,
  border,
}: {
  ref: (el: HTMLDivElement | null) => void;
  below: boolean;
  x?: number;
  border?: string;
}) => (
  <div
    ref={ref}
    style={{
      position: "absolute",
      width: ARROW_SIZE,
      height: ARROW_SIZE,
      background: "inherit",
      left: x ?? undefined,
      [below ? "top" : "bottom"]: -ARROW_SIZE / 2,
      transform: `rotate(${below ? 225 : 45}deg)`,
      ...(border ? { borderRight: border, borderBottom: border } : {}),
    }}
  />
);

const isCollapsed = (el: Element) => {
  const { width, height } = el.getBoundingClientRect();
  return width === 0 && height === 0;
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
