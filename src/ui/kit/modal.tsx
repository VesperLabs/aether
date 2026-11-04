import type { ComponentProps } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { Box, Flex } from "theme-ui";
import { GILDED_CORNERS } from "./modal-gilding";

type FlexProps = ComponentProps<typeof Flex>;
type ModalProps = FlexProps & { zoom?: number | string; bottomOffset?: number };

const ModalRoot = ({ sx, zoom = 1, bottomOffset = 0, ...props }: ModalProps) => {
  return (
    <Flex
      sx={{
        zIndex: "modal",
        gap: 1,
        /* The gilding takes up part of the frame; this keeps it wider than the gaps inside. */
        p: 2,
        borderRadius: 3,
        position: "fixed",
        flexDirection: "column",
        left: "50%",
        top: `50%`,
        marginTop: -bottomOffset / 2,
        pointerEvents: "all",
        transform: `translate(-50%, -50%) scale(${Math.max(1, Number(zoom))})`,
        transformOrigin: "center center",
        cursor: "default",
        ...GILDED_CORNERS,
        ...sx,
      }}
      variant="buttons.wood"
      {...props}
    />
  );
};

const ModalOverlay = ({ sx, ...props }: ComponentProps<typeof Box>) => {
  return (
    <Box
      sx={{
        position: "fixed",
        inset: "0 0 0 0",
        backgroundColor: "#000000",
        zIndex: "modal",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center center",
        pointerEvents: "all",
        ...sx,
      }}
      {...props}
    />
  );
};

const ModalHeader = ({ sx, ...props }: FlexProps) => {
  return (
    <Flex
      className="modal-header"
      sx={{
        alignItems: "center",
        px: 2,
        py: 1,
        minHeight: 32,
        fontSize: 1,
        gap: 1,
        borderRadius: 3,
        flex: "none",
        bg: "shadow.25",
        "& .icon": { filter: "drop-shadow(0 1px 1px rgba(0, 0, 0, 0.6))" },
        /* Joined to a body: same container, the heading set inside it as a rounded inset. */
        "&:has(+ .modal-body)": {
          position: "relative",
          isolation: "isolate",
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          "&::before": {
            content: '""',
            position: "absolute",
            inset: "3px",
            zIndex: -1,
            borderRadius: 3,
            bg: "shadow.25",
          },
        },
        ...sx,
      }}
      {...props}
    />
  );
};

const TAB_RADIUS = 4;
const PANEL_FILL = "rgba(0, 0, 0, 0.25)";

/* A concave corner: the panel's fill everywhere but a circle cut from the outer top corner. */
const tabFillet = (side: "left" | "right"): ThemeUIStyleObject => ({
  content: '""',
  position: "absolute",
  bottom: 0,
  [side === "left" ? "right" : "left"]: "100%",
  width: TAB_RADIUS,
  height: TAB_RADIUS,
  background: `radial-gradient(circle at top ${side}, transparent ${TAB_RADIUS - 0.5}px, ${PANEL_FILL} ${TAB_RADIUS}px)`,
});

const ACTIVE_TAB: ThemeUIStyleObject = {
  position: "relative",
  "&::before": tabFillet("left"),
  "&::after": tabFillet("right"),
  /* The first tab sits flush with the panel's edge, with no corner to curve into. */
  "&:first-of-type::before": { display: "none" },
};

const ModalTab = ({ active, sx, ...props }: FlexProps & { active: boolean }) => {
  return (
    <ModalHeader
      as="button"
      /* Not the default "submit": a tab may sit inside a form, like the login modal. */
      {...({ type: "button" } as object)}
      role="tab"
      aria-selected={active}
      sx={{
        borderRadius: `${TAB_RADIUS}px ${TAB_RADIUS}px 0 0`,
        border: 0,
        color: "inherit",
        fontFamily: "inherit",
        cursor: "pointer",
        bg: active ? "shadow.25" : "transparent",
        opacity: active ? 1 : 0.55,
        ...(active && ACTIVE_TAB),
        ...sx,
      }}
      {...props}
    />
  );
};

const ModalBody = ({ sx, ...props }: FlexProps) => {
  return (
    <Flex
      className="modal-body"
      sx={{
        p: 3,
        borderRadius: 3,
        bg: "shadow.25",
        whiteSpace: "wrap",
        flexDirection: "column",
        /* Directly under a heading, the two join into one panel. */
        ".modal-header + &": {
          mt: -1,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        },
        ...sx,
      }}
      {...props}
    />
  );
};

const ModalFooter = ({ sx, ...props }: FlexProps) => {
  return <Flex sx={{ gap: 1, flex: 1, ...sx }} {...props} />;
};

/** Radii for the panel under a row of tabs: square only where the first tab sits on it. */
const tabPanelRadius = (firstTabActive: boolean) =>
  `${firstTabActive ? 0 : TAB_RADIUS}px ${TAB_RADIUS}px ${TAB_RADIUS}px ${TAB_RADIUS}px`;

export const Modal = Object.assign(ModalRoot, {
  Overlay: ModalOverlay,
  Header: ModalHeader,
  Tab: ModalTab,
  tabPanelRadius,
  Body: ModalBody,
  Footer: ModalFooter,
});
