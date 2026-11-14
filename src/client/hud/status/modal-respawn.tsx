import { Modal, KeyboardButton } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";

export const ModalRespawn: React.FC = () => {
  const { socket, zoom, bottomOffset } = useAppContext();
  return (
    <>
      <Modal.Overlay sx={{ backgroundColor: "shadow.50" }} />
      <Modal zoom={zoom} bottomOffset={bottomOffset}>
        <Modal.Header icon="./assets/icons/pen.png">Confirm Respawn?</Modal.Header>
        <Modal.Body>Would you like to respawn?</Modal.Body>
        <Modal.Footer>
          <KeyboardButton
            sx={{ flex: 1 }}
            onClick={() => socket.emit("respawn")}
            keyboardKey="ENTER"
          >
            Respawn
          </KeyboardButton>
        </Modal.Footer>
      </Modal>
    </>
  );
};
