import { Switch as ThemeUiSwitch } from "theme-ui";

export function Switch({
  sx,
  ...props
}: {
  sx?: any;
  label?: string;
  checked: any;
  onChange: any;
  disabled?: boolean;
}) {
  return (
    <ThemeUiSwitch
      sx={{
        backgroundColor: "shadow.20",
        "input:checked ~ &": {
          backgroundColor: "set",
          transition: ".5s ease all",
        },
        "& > span": {
          width: "auto",
        },
        ...sx,
      }}
      {...props}
    />
  );
}
