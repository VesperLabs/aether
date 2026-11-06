import type { ReactNode } from "react";
import { Box, Button } from "@/ui";

/** An emoji button as tall as the control beside it. */
export const IconButton = ({
  label,
  icon,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <Button
    variant="menu"
    aria-label={label}
    className={active ? "active" : ""}
    disabled={disabled}
    onClick={onClick}
    sx={{
      flexShrink: 0,
      alignSelf: "stretch",
      /* A select's height, for rows with no control to stretch to. */
      minHeight: 26,
      boxSizing: "border-box",
      alignItems: "center",
      justifyContent: "center",
      py: 0,
      px: 2,
      borderRadius: 4,
      /* Beats the menu variant, which keeps disabled buttons solid. */
      "&[disabled]": { opacity: 0.9, filter: "grayscale(1)" },
    }}
  >
    <Box sx={{ fontSize: 0 }}>{icon}</Box>
  </Button>
);
