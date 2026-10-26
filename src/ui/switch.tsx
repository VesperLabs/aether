import type { ComponentProps } from "react";
import { Switch as ThemeUiSwitch } from "theme-ui";

export function Switch({ sx, ...props }: ComponentProps<typeof ThemeUiSwitch>) {
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
