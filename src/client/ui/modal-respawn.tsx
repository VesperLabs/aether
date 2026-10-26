import { Modal, KeyboardButton } from "@/ui";
import { useAppContext } from ".";

export const ModalRespawn: React.FC = () => {
  const { socket, zoom, bottomOffset } = useAppContext();
  return (
    <Modal zoom={zoom} bottomOffset={bottomOffset}>
      <Modal.Body>Would you like to respawn?</Modal.Body>
      <Modal.Footer>
        <KeyboardButton sx={{ flex: 1 }} onClick={() => socket.emit("respawn")} keyboardKey="R">
          Respawn
        </KeyboardButton>
      </Modal.Footer>
    </Modal>
  );
};
