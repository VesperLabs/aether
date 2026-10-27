import type { ComponentProps } from "react";
import { Text } from "theme-ui";

/** The "key:" part of a "key: value" line, in normal weight. */
export const Label = (props: ComponentProps<typeof Text>) => (
  <Text sx={{ fontWeight: "normal" }} {...props} />
);
