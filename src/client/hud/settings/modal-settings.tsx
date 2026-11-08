import { useState } from "react";
import { useAppContext } from "@/client/hud/app/context";
import { Box, Flex, Grid, Modal, KeyboardButton, ScrollFade, isMobile, useArrowTabs } from "@/ui";
import { KeyBindingsPanel } from "./key-bindings-panel";
import { MusicCredits } from "./music-credits";
import { UserSettingsForm } from "./user-settings-form";

/* Divided by the zoom the Modal scales by, so a zoomed modal still fits the screen. */
const modalWidth = (zoom: number | string) =>
  `min(300px, calc((100vw - 32px) / ${Math.max(1, Number(zoom))}))`;
/* Modal.Body's own padding, moved onto the scroller. */
const BODY_PAD = 16;
/* Leaves room for the tabs, the footer and the gilding. */
const MAX_BODY_HEIGHT = "calc(100dvh - 130px)";

const ALL_TABS = [
  { name: "settings", label: "Settings" },
  { name: "controls", label: "Controls" },
  { name: "credits", label: "Credits" },
] as const;
type TabName = (typeof ALL_TABS)[number]["name"];
/* Phones have no keys to bind */
const TABS = ALL_TABS.filter(({ name }) => !isMobile || name !== "controls");

export const ModalSettings: React.FC = () => {
  const { setTabSettings, zoom, bottomOffset } = useAppContext();
  const [tab, setTab] = useState<TabName>("settings");
  useArrowTabs(
    TABS.map(({ name }) => name),
    tab,
    setTab,
  );

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
            {TABS.map(({ name, label }) => (
              <Modal.Tab
                key={name}
                active={tab === name}
                onClick={() => setTab(name)}
                sx={{ px: 3 }}
              >
                <Modal.TabIcon active={tab === name} />
                {label}
              </Modal.Tab>
            ))}
          </Flex>
          {/* Padded inside the scroller, so its scrollbar runs along the panel's edge */}
          <Modal.Body sx={{ p: 0, borderRadius: Modal.tabPanelRadius(tab === TABS[0].name) }}>
            {/* Scrolls here, not on the Modal, whose gilding reaches past its edges. */}
            <ScrollFade sx={{ maxHeight: MAX_BODY_HEIGHT, p: `${BODY_PAD}px` }}>
              <Grid sx={{ gap: 0, gridTemplateColumns: "minmax(0, 1fr)" }}>
                <Box sx={panel("settings")}>
                  <UserSettingsForm />
                </Box>
                {!isMobile && (
                  <ScrollFade
                    sx={{
                      ...panel("controls"),
                      /* Takes no size of its own: fills the other tabs' box and scrolls inside it,
                       * reaching out over the padding so its scrollbar sits on the panel's edge */
                      width: 0,
                      minWidth: `calc(100% + ${BODY_PAD * 2}px)`,
                      height: 0,
                      minHeight: `calc(100% + ${BODY_PAD * 2}px)`,
                      m: `-${BODY_PAD}px`,
                      p: `${BODY_PAD}px`,
                    }}
                  >
                    <KeyBindingsPanel />
                  </ScrollFade>
                )}
                <Box sx={panel("credits")}>
                  <MusicCredits />
                </Box>
              </Grid>
            </ScrollFade>
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
