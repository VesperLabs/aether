import React from "react";
import { Modal, KeyboardButton, useAppContext, Icon } from "./";

const ModalSign: React.FC = () => {
  const { socket, sign, setSign } = useAppContext();
  return (
    <Modal>
      <Modal.Header sx={{ paddingLeft: 34 }}>
        <Icon
          icon="../assets/images/sign-1.png"
          size={42}
          sx={{ transform: "scale(0.5)", position: "absolute", left: 0 }}
        />
        Sign
      </Modal.Header>
      <Modal.Body>{sign}</Modal.Body>
      <Modal.Footer>
        <KeyboardButton sx={{ flex: 1 }} onClick={() => setSign(null)} keyboardKey="ESCAPE">
          Close
        </KeyboardButton>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalSign;
