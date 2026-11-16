import { ButtonGroup, Text } from "@/ui";
import { FloatingPanel } from "./floating-panel";
import { useLocation } from "wouter";

const LAB_PAGES = [
  { label: "Sprites", value: "/" },
  { label: "NPCs", value: "/npcs" },
] as const;

type LabPath = (typeof LAB_PAGES)[number]["value"];

const NAV_WIDTH = 200;

/** Tabs between the lab's tools, in a small window of their own that stays put across pages. */
export const LabNav = () => {
  const [location, navigate] = useLocation();
  const current = LAB_PAGES.find(({ value }) => value === location)?.value ?? "/";
  return (
    <FloatingPanel
      id="nav"
      title={<Text sx={{ fontWeight: "bold" }}>Lab</Text>}
      width={NAV_WIDTH}
      start={{ x: (window.innerWidth - NAV_WIDTH) / 2, y: 16 }}
    >
      <nav>
        <ButtonGroup<LabPath>
          label="Lab tools"
          value={current}
          options={LAB_PAGES}
          onChange={navigate}
        />
      </nav>
    </FloatingPanel>
  );
};
