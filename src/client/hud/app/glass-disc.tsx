import type { ReactNode } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { Box } from "@/ui";

/** The collapsed disc's size. */
export const DISC_SIZE = 30;

/** The glass behind every top right bar button. */
export const GLASS_PILL: ThemeUIStyleObject = {
  p: "4px",
  borderRadius: 999,
  bg: "shadow.30",
  backdropFilter: "blur(10px)",
  pointerEvents: "all",
};

/** The round button inside a glass pill. */
export const DiscButton = ({
  label,
  onClick,
  dim,
  children,
}: {
  label: string;
  onClick: () => void;
  dim?: boolean;
  children: ReactNode;
}) => (
  <Box
    as="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    sx={{
      all: "unset",
      cursor: "pointer",
      flexShrink: 0,
      width: DISC_SIZE - 8,
      height: DISC_SIZE - 8,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "9px",
      color: "white",
      bg: "shadow.30",
      opacity: dim ? 0.6 : 1,
      "&:hover": { opacity: 1 },
    }}
  >
    {children}
  </Box>
);
