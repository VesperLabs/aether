import type { ReactNode } from "react";
import { Flex, Text } from "theme-ui";

const ROW_LABEL_WIDTH = 64;

/**
 * A control with its label: stacked above it, or beside it in a fixed column so rows line up.
 * The one way forms label things, so every panel reads the same.
 */
export const Field = ({
  label,
  layout = "stack",
  badge,
  children,
}: {
  label: ReactNode;
  /** Shown at full strength after the dimmed label, like a pending dot. */
  badge?: ReactNode;
  layout?: "stack" | "row";
  children: ReactNode;
}) => {
  const row = layout === "row";
  return (
    <Flex
      sx={{
        flexDirection: row ? "row" : "column",
        alignItems: row ? "center" : "stretch",
        gap: row ? 2 : 1,
        minWidth: 0,
      }}
    >
      <Flex
        sx={{
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
          width: row ? ROW_LABEL_WIDTH : "auto",
        }}
      >
        <Text sx={{ fontSize: 1, opacity: 0.5, textTransform: "capitalize" }}>{label}</Text>
        {badge}
      </Flex>
      {/* Takes what's left of the row and wraps, so wide controls never run past the panel. */}
      <Flex sx={{ flex: 1, minWidth: 0, gap: 2, alignItems: "center", flexWrap: "wrap" }}>
        {children}
      </Flex>
    </Flex>
  );
};

/** A dim note under a field or at the end of a panel section. */
export const FieldHint = ({ children }: { children: ReactNode }) => (
  <Text sx={{ fontSize: 0, opacity: 0.5 }}>{children}</Text>
);
