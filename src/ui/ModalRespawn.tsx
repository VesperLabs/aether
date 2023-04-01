import React from "react";
import { Modal, Button, useAppContext } from "./";

const ModalRespawn = () => {
  const { socket } = useAppContext();
  return (
    <Modal>
      <Modal.Body>Would you like to respawn?</Modal.Body>
      <Modal.Footer>
        <Button
          variant="wood"
          sx={{ flex: 1 }}
          onClick={() => {
            socket.emit("respawn");
          }}
        >
          Respawn
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalRespawn;
