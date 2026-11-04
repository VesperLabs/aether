import type { ReactNode } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { Box, Flex, Text } from "theme-ui";

/** Lines take the label's colour, faded, so the divider reads on any panel and follows coloured labels. */
const LINE_STYLE: ThemeUIStyleObject = {
  flex: 1,
  height: 0,
  borderTop: "1px dotted currentColor",
  opacity: 0.2,
};

/** A small open diamond, the wiki's rule ornament. */
const Diamond = () => (
  <Box
    aria-hidden
    sx={{
      width: 4,
      height: 4,
      flexShrink: 0,
      border: "1px solid currentColor",
      transform: "rotate(45deg)",
      opacity: 0.3,
    }}
  />
);

/**
 * Dotted rules either side of a small spaced-out caps label, each ending in a diamond, like the
 * wiki's section rules. Without a label it is a rule with one diamond in the middle.
 */
export const TextDivider = ({
  children,
  sx,
  color = "text",
}: {
  children?: ReactNode;
  sx?: ThemeUIStyleObject;
  color?: string;
}) => (
  <Flex sx={{ alignItems: "center", gap: 2, py: 2, width: "100%", color, ...sx }}>
    <Box aria-hidden sx={LINE_STYLE} />
    <Diamond />
    {children != null && (
      <>
        <Text
          sx={{
            fontSize: 0,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            lineHeight: 1,
            whiteSpace: "nowrap",
            opacity: 0.55,
          }}
        >
          {children}
        </Text>
        <Diamond />
      </>
    )}
    <Box aria-hidden sx={LINE_STYLE} />
  </Flex>
);
