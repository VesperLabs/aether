import { Box, Switch } from "@/ui/kit";

/**
 * Height of the row above the login button: Remember me on Login, the genders on the others. The
 * switch's 16px track inside its control row's 6px padding above and below.
 */
export const FORM_ROW_HEIGHT = 28;

/** The "Remember me" row, on Login only: the other tabs have nothing to remember. */
export const RememberRow = ({
  checked = false,
  onChange,
}: {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}) => (
  <Box
    sx={{
      /* The same height as the gender row in its place on the other tabs, so they line up */
      height: FORM_ROW_HEIGHT,
      /* To the right of the form, as wide as it needs */
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      "& label": {
        alignItems: "center",
        fontSize: 0,
      },
    }}
  >
    <Switch label="Remember me" checked={checked} onChange={(e) => onChange?.(e.target.checked)} />
  </Box>
);
