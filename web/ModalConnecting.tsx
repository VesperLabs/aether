import { Modal, Icon } from "@aether/ui";

export const ModalConnecting: React.FC = () => {
  return (
    <>
      <Modal.Overlay />
      <Modal sx={{ maxWidth: 300 }}>
        <Modal.Header sx={{ paddingLeft: 34 }}>
          <Icon
            icon={"./assets/icons/danger.png"}
            size={42}
            sx={{ position: "absolute", left: 0 }}
          />
          Give'r a sec...
        </Modal.Header>
        <Modal.Body>
          I'm on the free tier, so please be patient while the application spins up.
        </Modal.Body>
      </Modal>
    </>
  );
};

export default ModalConnecting;
