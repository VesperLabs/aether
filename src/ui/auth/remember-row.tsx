import { Box, Switch } from "@/ui/kit";

/** The "Remember me" row. `reserveOnly` keeps its space, so the tabs without it line up. */
export const RememberRow = ({
  checked = false,
  onChange,
  reserveOnly = false,
}: {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  reserveOnly?: boolean;
}) => (
  <Box
    aria-hidden={reserveOnly}
    sx={{
      visibility: reserveOnly ? "hidden" : "visible",
      "& label": {
        justifyContent: "flex-end",
        alignItems: "center",
        fontSize: 0,
      },
    }}
  >
    <Switch label="Remember me" checked={checked} onChange={(e) => onChange?.(e.target.checked)} />
  </Box>
);
