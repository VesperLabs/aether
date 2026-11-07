import { Modal, Icon, getHudZoomFor } from "@/ui";

/** Shown while the server wakes up, at the size the game would show its modals. */
export const ModalConnecting = () => (
  <>
    <Modal.Overlay />
    <Modal zoom={getHudZoomFor(window.innerWidth, window.innerHeight)} sx={{ maxWidth: 300 }}>
      <Modal.Header>
        <Icon icon="./assets/icons/danger.png" size={22} />
        Give'r a sec...
      </Modal.Header>
      <Modal.Body sx={{ whiteSpace: "normal", lineHeight: 1.5 }}>
        I'm on the free tier, so please be patient while the application spins up.
      </Modal.Body>
    </Modal>
  </>
);
