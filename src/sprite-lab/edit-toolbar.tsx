import type { PointerEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Box, Flex } from "@/ui";
import { IconButton } from "./icon-button";
import {
  AdjustIcon,
  DropperIcon,
  EraserIcon,
  FlipXIcon,
  FlipYIcon,
  MarqueeIcon,
  MoveIcon,
  PencilIcon,
  RotateIcon,
  UndoIcon,
} from "./tool-icons";
import { usePanelPosition } from "./use-panel-position";

export type EditTool = "move" | "pencil" | "eraser" | "dropper" | "marquee";

const TOOLS: { tool: EditTool; label: string; icon: ReactNode }[] = [
  {
    tool: "move",
    label: "Move: drag the selection, or the whole frame without one",
    icon: <MoveIcon />,
  },
  { tool: "pencil", label: "Pencil", icon: <PencilIcon /> },
  { tool: "eraser", label: "Eraser", icon: <EraserIcon /> },
  { tool: "dropper", label: "Eyedropper", icon: <DropperIcon /> },
  {
    tool: "marquee",
    label:
      "Marquee: drag to select, drag inside or use arrows to move (Shift for 10), Delete to clear, ⌘C/X/V to copy, cut, paste",
    icon: <MarqueeIcon />,
  },
];
/** Clear of the Sprite Lab window, whose wood it would blend into. */
const START_POSITION = { x: 372, y: 16 };

/** The floating tool panel. On the page body, so the preview can't clip it; drag it anywhere. */
export const EditToolbar = ({
  tool,
  color,
  canUndo,
  adjusting,
  onTool,
  onColor,
  onUndo,
  onAdjust,
  onFlip,
  onRotate,
}: {
  tool?: EditTool;
  color: string;
  canUndo: boolean;
  /** The adjust panel is open. */
  adjusting: boolean;
  onTool: (tool?: EditTool) => void;
  onColor: (color: string) => void;
  onUndo: () => void;
  onAdjust: () => void;
  onFlip: (axis: "x" | "y") => void;
  onRotate: () => void;
}) => {
  const { position, startDrag } = usePanelPosition("tool-palette", START_POSITION);

  const handleDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button === 0 && !(e.target as Element).closest("button, input")) startDrag(e);
  };

  return createPortal(
    <Flex
      variant="buttons.wood"
      style={{ left: position.x, top: position.y }}
      onPointerDown={handleDown}
      sx={{
        position: "fixed",
        zIndex: "menus",
        /* The wood variant is a button's: without these it animates and lags behind the pointer. */
        transition: "none",
        transform: "none",
        cursor: "grab",
        touchAction: "none",
        userSelect: "none",
        flexDirection: "column",
        gap: 1,
        p: 1,
        borderRadius: 3,
        boxShadow: "0 0 0 1px #000, 0 0 0 2px #c8962e, 0 6px 14px rgba(0, 0, 0, .7)",
      }}
    >
      <Box
        aria-hidden
        sx={{
          height: 10,
          borderRadius: 2,
          background:
            "repeating-linear-gradient(to bottom, rgba(0, 0, 0, .4) 0 1px, transparent 1px 3px)",
        }}
      />
      {TOOLS.map(({ tool: option, label, icon }) => (
        <IconButton
          key={option}
          label={label}
          icon={icon}
          active={tool === option}
          onClick={() => onTool(tool === option ? undefined : option)}
        />
      ))}
      <IconButton label="Flip horizontally" icon={<FlipXIcon />} onClick={() => onFlip("x")} />
      <IconButton label="Flip vertically" icon={<FlipYIcon />} onClick={() => onFlip("y")} />
      <IconButton label="Rotate 90° clockwise" icon={<RotateIcon />} onClick={onRotate} />
      <IconButton
        label="Brightness, contrast and saturation"
        icon={<AdjustIcon />}
        active={adjusting}
        onClick={onAdjust}
      />
      <IconButton label="Undo" icon={<UndoIcon />} disabled={!canUndo} onClick={onUndo} />
      <Box
        as="input"
        {...{ type: "color", value: color, "aria-label": "Colour", title: "Colour" }}
        onChange={(e) => onColor((e.target as HTMLInputElement).value)}
        sx={{
          display: "block",
          width: "100%",
          height: 22,
          p: 0,
          border: "none",
          bg: "transparent",
          cursor: "pointer",
        }}
      />
    </Flex>,
    document.body,
  );
};
