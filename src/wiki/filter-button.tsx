import { Flex, Icon, Text } from "@/ui";
import { PAPER } from "./paper";

/** A filter: an icon and label, muted until it's on, then on a slightly darker patch of parchment. */
export const Filter = ({
  active,
  onClick,
  icon,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: string;
  color?: string;
  children: string;
}) => (
  <Flex
    as="button"
    onClick={onClick}
    title={children}
    sx={{
      alignItems: "center",
      gap: 1,
      height: 36,
      px: 1,
      py: 0,
      bg: active ? "rgba(74, 56, 38, .1)" : "transparent",
      border: "none",
      borderRadius: 2,
      color: color ?? PAPER.ink,
      font: "inherit",
      fontSize: 1,
      fontWeight: 600,
      textTransform: "capitalize",
      cursor: "pointer",
      opacity: active ? 1 : 0.65,
      "& .icon": { filter: active ? "none" : "grayscale(1)" },
      "&:hover": { opacity: 1 },
    }}
  >
    {icon && <Icon icon={icon} size={32} />}
    <Text sx={{ display: icon ? ["none", "none", "block"] : "block" }}>{children}</Text>
  </Flex>
);
