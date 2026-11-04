import { useState } from "react";
import { useAppContext } from "@/client/hud/app/context";
import { Box, Flex, Grid, Modal, KeyboardButton, Icon, isMobile } from "@/ui";
import { MusicCredits } from "./music-credits";
import { UserSettingsForm } from "./user-settings-form";

const MOBILE_WIDTH = "min(300px, calc(100vw - 32px))";
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
        sx={isMobile ? { width: MOBILE_WIDTH } : undefined}
      >
        <Flex sx={{ flexDirection: "column" }}>
          <Flex role="tablist">
            {TABS.map(({ name, label, ...rest }) => (
              <Modal.Tab key={name} active={tab === name} onClick={() => setTab(name)}>
                {"icon" in rest && <Icon icon={rest.icon} size={22} />}
                {label}
              </Modal.Tab>
            ))}
          </Flex>
          {/* Scrolls here, not on the Modal, whose gilding reaches past its edges. */}
          <Modal.Body
            sx={{
              maxHeight: MAX_BODY_HEIGHT,
              overflowY: "auto",
              borderRadius: Modal.tabPanelRadius(tab === TABS[0].name),
            }}
          >
            <Grid sx={{ gap: 0 }}>
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
