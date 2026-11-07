import { useState } from "react";
import { useAppContext } from "@/client/hud/app/context";
import { Box, Flex, Grid, Modal, KeyboardButton, isMobile } from "@/ui";
import { MusicCredits } from "./music-credits";
import { UserSettingsForm } from "./user-settings-form";

/* Divided by the zoom the Modal scales by, so a zoomed modal still fits the screen. */
const modalWidth = (zoom: number | string) =>
  `min(300px, calc((100vw - 32px) / ${Math.max(1, Number(zoom))}))`;
/* Leaves room for the tabs, the footer and the gilding. */
const MAX_BODY_HEIGHT = "calc(100dvh - 130px)";

const TABS = [
  { name: "settings", label: "Settings", icon: "./assets/icons/pen.png" },
  { name: "credits", label: "Credits" },
] as const;
type TabName = (typeof TABS)[number]["name"];

export const ModalSettings: React.FC = () => {
  const { setTabSettings, zoom, bottomOffset } = useAppContext();
  const [tab, setTab] = useState<TabName>("settings");

  /* Stacked in one grid cell, so the modal keeps its size whichever tab is showing. */
  const panel = (name: TabName) => ({
    gridArea: "1 / 1",
    visibility: tab === name ? ("visible" as const) : ("hidden" as const),
  });

  return (
    <>
      <Modal.Overlay sx={{ backgroundColor: "shadow.50" }} onClick={() => setTabSettings(false)} />
      <Modal
        zoom={isMobile ? 1 : zoom}
        bottomOffset={bottomOffset}
        /* A fixed box from left: 50% only gets half the screen, so it needs a floor. */
        sx={isMobile ? { width: modalWidth(1) } : { minWidth: modalWidth(zoom) }}
      >
        <Flex sx={{ flexDirection: "column" }}>
          <Flex role="tablist">
            {TABS.map(({ name, label, ...rest }) => (
              <Modal.Tab
                key={name}
                active={tab === name}
                onClick={() => setTab(name)}
                icon={"icon" in rest ? rest.icon : undefined}
                sx={{ px: 3 }}
              >
                {label}
              </Modal.Tab>
            ))}
          </Flex>
          {/* Scrolls here, not on the Modal, whose gilding reaches past its edges. */}
          <Modal.Body
            sx={{
              maxHeight: MAX_BODY_HEIGHT,
              overflowY: "auto",
              overflowX: "hidden",
              borderRadius: Modal.tabPanelRadius(tab === TABS[0].name),
            }}
          >
            <Grid sx={{ gap: 0, gridTemplateColumns: "minmax(0, 1fr)" }}>
              <Box sx={panel("settings")}>
                <UserSettingsForm />
              </Box>
              <Box sx={panel("credits")}>
                <MusicCredits />
              </Box>
            </Grid>
          </Modal.Body>
        </Flex>
        <Modal.Footer>
          <KeyboardButton
            sx={{ flex: 1 }}
            onClick={() => setTabSettings(false)}
            keyboardKey="ESCAPE"
          >
            Close
          </KeyboardButton>
        </Modal.Footer>
      </Modal>
    </>
  );
};
