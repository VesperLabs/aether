import React, { useState } from "react";
import { Modal, Input, KeyboardButton, Button, useAppContext } from "./";

const ModalLogin: React.FC = () => {
  const { socket } = useAppContext();
  const [email, setEmail] = useState("arf@arf.arf");
  const [password, setPassword] = useState("arf");

  return (
    <Modal>
      <Modal.Header>Login (WIP)</Modal.Header>
      <Modal.Body sx={{ gap: 2 }}>
        <Input
          readOnly
          autoFocus={true}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          readOnly
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Modal.Body>
      <Modal.Footer>
        <KeyboardButton
          sx={{ flex: 1 }}
          onClick={() => socket.emit("login", { email, password })}
          keyboardKey="ENTER"
        >
          Login
        </KeyboardButton>
        <Button variant="wood">Register</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalLogin;
