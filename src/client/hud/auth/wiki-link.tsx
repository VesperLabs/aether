import { Button, Icon, Link, Text } from "@/ui";

/** A button in the top right corner of the page, out to the wiki. */
export const WikiLink = () => (
  <Button
    as={Link}
    variant="menu"
    {...{ href: process.env.WIKI_URL }}
    sx={{
      position: "fixed",
      top: 3,
      right: 3,
      display: "flex",
      alignItems: "center",
      gap: 1,
      px: 3,
      textDecoration: "none",
      pointerEvents: "all",
    }}
  >
    <Icon size={22} icon="./assets/icons/book.png" />
    <Text>Wiki</Text>
  </Button>
);
