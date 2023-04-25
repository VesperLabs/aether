import React from "react";
import { Modal, Input, KeyboardButton, Button, useAppContext } from "./";

const ModalLogin: React.FC = () => {
  const { socket } = useAppContext();
  return (
    <Modal>
      <Modal.Header>Login</Modal.Header>
      <Modal.Body sx={{ gap: 2 }}>
        <Input placeholder="Email" />
        <Input placeholder="Password" />
      </Modal.Body>
      <Modal.Footer>
        <KeyboardButton sx={{ flex: 1 }} onClick={() => socket.emit("login")} keyboardKey="ENTER">
          Login
        </KeyboardButton>
        <Button variant="wood">Register</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalLogin;
