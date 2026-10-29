import { Box } from "theme-ui";

interface NotificationBadgeProps {
  /** How many things need attention; the badge hides at 0. */
  count?: number;
  sx?: Record<string, unknown>;
}

/** A tiny red counter pinned to the top-right corner of its (relatively positioned) parent. */
export const NotificationBadge = ({ count = 0, sx }: NotificationBadgeProps) => {
  if (count <= 0) return null;
  return (
    <Box
      sx={{
        position: "absolute",
        top: "-4px",
        right: "-4px",
        minWidth: 14,
        height: 14,
        px: "3px",
        borderRadius: 7,
        bg: "red.600",
        border: "1px solid",
        borderColor: "red.900",
        boxShadow: "0 1px 2px rgba(0,0,0,.6)",
        color: "white",
        fontSize: "9px",
        fontWeight: "bold",
        lineHeight: "12px",
        textAlign: "center",
        pointerEvents: "none",
        zIndex: 1,
        ...sx,
      }}
    >
      {count > 9 ? "9+" : count}
    </Box>
  );
};
