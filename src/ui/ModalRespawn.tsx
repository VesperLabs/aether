import React from "react";
import { Modal, KeyboardButton, useAppContext } from "./";

const ModalRespawn: React.FC = () => {
  const { socket } = useAppContext();
  return (
    <Modal>
      <Modal.Body>Would you like to respawn?</Modal.Body>
      <Modal.Footer>
        <KeyboardButton sx={{ flex: 1 }} onClick={() => socket.emit("respawn")} keyboardKey="R">
          Respawn
        </KeyboardButton>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalRespawn;
