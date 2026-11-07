import { Box, ButtonGroup } from "@/ui";
import { useLocation } from "wouter";

const LAB_PAGES = [
  { label: "Sprites", value: "/" },
  { label: "Maps", value: "/maps" },
  { label: "Stamps", value: "/maps/stamps" },
] as const;

type LabPath = (typeof LAB_PAGES)[number]["value"];

/** Tabs between the lab's tools, at the right end of each tool's panel header. */
export const LabNav = () => {
  const [location, navigate] = useLocation();
  const current = LAB_PAGES.find(({ value }) => value === location)?.value ?? "/";
  return (
    <Box as="nav" sx={{ ml: "auto" }}>
      <ButtonGroup<LabPath>
        label="Lab tools"
        value={current}
        options={LAB_PAGES}
        onChange={navigate}
      />
    </Box>
  );
};
