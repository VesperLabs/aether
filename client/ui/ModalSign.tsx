import { useAppContext } from "./";
import { Modal, KeyboardButton, Icon } from "@aether/ui";

const ModalSign: React.FC = () => {
  const { sign, setSign, zoom, bottomOffset } = useAppContext();
  return (
    <Modal zoom={zoom} bottomOffset={bottomOffset}>
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
