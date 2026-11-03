import type { ComponentProps } from "react";
import { Flex, Icon } from "@/ui";

const resolveTypeIcon = (type: string) => {
  if (type === "shield") {
    type = "handLeft";
  }
  if (type === "weapon") {
    type = "handRight";
  }
  if (type === "ring") {
    type = "ring1";
  }
  if (type === "stackable") {
    type = "mana";
  }
  if (type === "spell") {
    type = "book";
  }

  /* From the wiki itself, like its other icons: the server URL can be localhost, which a phone on
     the same network can't reach. */
  return `./assets/icons/${type}.png`;
};

export { resolveTypeIcon };

export const RowTitle = ({
  icon,
  sx,
  children,
  ...props
}: ComponentProps<typeof Flex> & { icon?: string }) => (
  <Flex
    sx={{
      gap: 1,
      alignItems: "center",
      fontWeight: "bold",
      background: "shadow.20",
      px: 2,
      py: 1,
      borderRadius: 8,
      textTransform: "capitalize",
      width: "100%",
      ...sx,
    }}
    {...props}
  >
    {icon && <Icon icon={resolveTypeIcon(icon)} />}
    {children}
  </Flex>
);
