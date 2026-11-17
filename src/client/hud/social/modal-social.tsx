import { useState } from "react";
import { useAppContext } from "@/client/hud/app/context";
import { Flex, Modal, KeyboardButton, TextDivider, useArrowTabs } from "@/ui";
import { CompanionsPanel } from "./companions-panel";
import { ActionButton, LeaveButton, PlayerRow, type SocialPlayer } from "./player-row";
import { PlayerSearch } from "./player-search";

const TABS = [
  { name: "people", label: "People" },
  { name: "companions", label: "Companions" },
] as const;
type TabName = (typeof TABS)[number]["name"];

/**
 * People: your party and anyone who's invited you, then a search box for everyone else.
 * Companions: the creatures you caught.
 */
export const ModalSocial = () => {
  const [tab, setTab] = useState<TabName>("people");
  useArrowTabs(
    TABS.map(({ name }) => name),
    tab,
    setTab,
  );
  const { setTabSocial, zoom, bottomOffset, hero, party, partyInvites, players } = useAppContext();
  const scale = Math.max(1, Number(zoom) || 1);
  const partyIds = party?.members?.map((p: SocialPlayer) => p?.id) ?? [];
  const otherPlayers =
    players?.filter((p) => !partyIds.includes(p?.id) && hero?.id !== p?.id) ?? [];
  const inviters = otherPlayers.filter((p) =>
    partyInvites?.some((invite) => invite?.inviter?.id === p?.id),
  );
  const close = () => setTabSocial(false);

  return (
    <>
      <Modal.Overlay sx={{ backgroundColor: "shadow.50" }} onClick={close} />
      <Modal
        zoom={zoom}
        bottomOffset={bottomOffset}
        sx={{ width: `min(420px, calc(100vw / ${scale} - 16px))` }}
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
          <Modal.Body
            sx={{ p: 2, gap: 1, borderRadius: Modal.tabPanelRadius(tab === TABS[0].name) }}
          >
            {tab === "companions" && <CompanionsPanel />}
            {tab === "people" && (
              <>
                {partyIds.length > 0 && (
                  <>
                    <TextDivider>Party</TextDivider>
                    {party?.members?.map((player: SocialPlayer) => (
                      <PlayerRow partyPlayer={player} key={player?.id}>
                        <LeaveButton player={player} />
                      </PlayerRow>
                    ))}
                  </>
                )}
                {inviters.length > 0 && (
                  <>
                    <TextDivider>Invites</TextDivider>
                    {inviters.map((player) => (
                      <PlayerRow partyPlayer={player} key={player?.id}>
                        <ActionButton player={player} />
                      </PlayerRow>
                    ))}
                  </>
                )}
                <TextDivider>Invite</TextDivider>
                <PlayerSearch players={otherPlayers} />
              </>
            )}
          </Modal.Body>
        </Flex>
        <Modal.Footer sx={{ flex: "none" }}>
          <KeyboardButton sx={{ flex: 1 }} onClick={close} keyboardKey="ESCAPE">
            Close
          </KeyboardButton>
        </Modal.Footer>
      </Modal>
    </>
  );
};
