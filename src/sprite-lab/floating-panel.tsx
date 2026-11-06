import { useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Flex, Panel } from "@/ui";
import { IconButton } from "./icon-button";
import { usePanelPosition, type PanelPosition } from "./use-panel-position";

/** Under the tool panel and dropdowns, which sit on the theme's `menus` layer. */
let topLayer = 100;
const BEHIND_LAYER = topLayer;

const getNextLayer = () => {
  topLayer += 1;
  return topLayer;
};

/** A window: dragged by its title bar, stays where it's left, comes to the front when pressed. */
export const FloatingPanel = ({
  id,
  title,
  width,
  start,
  onClose,
  overflowing = false,
  behind = false,
  children,
}: {
  /** Names its remembered position. */
  id: string;
  title: ReactNode;
  width: number;
  start: PanelPosition;
  onClose?: () => void;
  /** Lets things stick out past the window, at the cost of scrolling when it's too tall. */
  overflowing?: boolean;
  /** Stays under every other window, so a big one can't bury the small ones it's used with. */
  behind?: boolean;
  children: ReactNode;
}) => {
  const { position, startDrag } = usePanelPosition(id, start);
  const [layer, setLayer] = useState(getNextLayer);

  const handleDown = (e: PointerEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    /* React passes presses up through portals, so a window it opened would drag this one too. */
    if (!e.currentTarget.contains(target)) return;
    setLayer(getNextLayer());
    if (e.button === 0 && target.closest(".modal-header") && !target.closest("button")) {
      startDrag(e);
    }
  };

  return createPortal(
    <Flex
      onPointerDownCapture={handleDown}
      style={{ left: position.x, top: position.y, zIndex: behind ? BEHIND_LAYER : layer }}
      sx={{ position: "fixed", ".modal-header": { cursor: "move", touchAction: "none" } }}
    >
      <Panel
        width={width}
        sx={{
          maxHeight: "calc(100vh - 16px)",
          boxShadow: "0 4px 10px rgba(0, 0, 0, .5)",
          ".modal-body": { overflowY: overflowing ? "visible" : "auto", minHeight: 0 },
        }}
        header={
          <>
            {title}
            {onClose && <IconButton label="Close" icon="❌" onClick={onClose} />}
          </>
        }
      >
        {children}
      </Panel>
    </Flex>,
    document.body,
  );
};
