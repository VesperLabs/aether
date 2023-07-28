import { Flex, Icon } from "@aether/ui";

const resolveTypeIcon = (type) => {
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
  return `assets/icons/${type}.png`;
};

export { resolveTypeIcon };

const RowTitle = ({ icon, sx, children, ...props }: any) => (
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

export default RowTitle;
