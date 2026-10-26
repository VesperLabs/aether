import type { ComponentProps } from "react";
import { Text } from "@/ui";

export const TooltipLabel = (props: ComponentProps<typeof Text>) => <Text sx={{ fontWeight: "normal" }} {...props} />;
