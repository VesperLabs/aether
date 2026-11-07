import { useAppContext } from "@/client/hud/app/context";
import { Modal, KeyboardButton, TextDivider } from "@/ui";
import { ActionButton, LeaveButton, PlayerRow, type SocialPlayer } from "./player-row";
import { PlayerSearch } from "./player-search";

/** Your party and anyone who's invited you, then a search box for everyone else. */
export const ModalSocial = () => {
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
        <Modal.Header icon="./assets/icons/social.png" sx={{ flex: "none" }}>
          Social
        </Modal.Header>
        <Modal.Body sx={{ p: 2, gap: 1 }}>
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
        </Modal.Body>
        <Modal.Footer sx={{ flex: "none" }}>
          <KeyboardButton sx={{ flex: 1 }} onClick={close} keyboardKey="ESCAPE">
            Close
          </KeyboardButton>
        </Modal.Footer>
      </Modal>
    </>
  );
};
