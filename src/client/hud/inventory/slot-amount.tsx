import type { ComponentProps } from "react";
import { Box } from "@/ui";

export const SlotAmount = (props: ComponentProps<typeof Box>) => (
  <Box
    sx={{
      position: "absolute",
      mt: `1px`,
      ml: `2px`,
      fontSize: 0,
      zIndex: 2,
    }}
    {...props}
  />
);
