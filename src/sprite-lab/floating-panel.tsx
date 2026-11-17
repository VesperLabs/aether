import { useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Flex, Panel } from "@/ui";
import { SignButton } from "./sign-button";
import { usePanelPosition, type PanelPosition } from "./use-panel-position";

/** Under the tool panel and dropdowns, which sit on the theme's `menus` layer. */
let topLayer = 100;

const collapsedKey = (id: string) => `sprite-lab-panel-${id}-collapsed`;

/** Whether a window was left folded up; open when unknown or storage is unavailable. */
const readCollapsed = (id: string) => {
  try {
    return localStorage.getItem(collapsedKey(id)) === "1";
  } catch {
    return false;
  }
};

const saveCollapsed = (id: string, collapsed: boolean) => {
  try {
    localStorage.setItem(collapsedKey(id), collapsed ? "1" : "0");
  } catch {
    /* Only a convenience: it just opens unfolded next time. */
  }
};

const getNextLayer = () => {
  topLayer += 1;
  return topLayer;
};

/**
 * A window: dragged by its title bar, stays where it's left, comes to the front when pressed, and
 * folds up to its title bar with its fold button or a double click on the bar (remembered per
 * window). Folded, its contents stay
 * mounted, so nothing in them is lost.
 */
export const FloatingPanel = ({
  id,
  title,
  width,
  start,
  onClose,
  overflowing = false,
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
  children: ReactNode;
}) => {
  const { position, startDrag } = usePanelPosition(id, start);
  const [layer, setLayer] = useState(getNextLayer);
  const [collapsed, setCollapsed] = useState(() => readCollapsed(id));
  const toggleCollapsed = () => {
    saveCollapsed(id, !collapsed);
    setCollapsed(!collapsed);
  };

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
      onDoubleClick={(e) => {
        const target = e.target as Element;
        /* Only the bar itself: not its buttons, nor anything a portal passes up from elsewhere */
        if (!e.currentTarget.contains(target) || target.closest("button")) return;
        if (target.closest(".modal-header")) toggleCollapsed();
      }}
      style={{ left: position.x, top: position.y, zIndex: layer }}
      sx={{ position: "fixed", ".modal-header": { cursor: "move", touchAction: "none" } }}
    >
      <Panel
        width={width}
        collapsed={collapsed}
        sx={{
          maxHeight: "calc(100vh - 16px)",
          boxShadow: "0 4px 10px rgba(0, 0, 0, .5)",
          ".modal-body": { overflowY: overflowing ? "visible" : "auto", minHeight: 0 },
        }}
        header={
          <>
            {title}
            <Flex sx={{ ml: "auto", gap: 1, flexShrink: 0 }}>
              <SignButton
                sign={collapsed ? "plus" : "minus"}
                label={collapsed ? "Unfold" : "Fold up"}
                onClick={toggleCollapsed}
              />
              {onClose && <SignButton sign="close" label="Close" onClick={onClose} />}
            </Flex>
          </>
        }
      >
        {children}
      </Panel>
    </Flex>,
    document.body,
  );
};
