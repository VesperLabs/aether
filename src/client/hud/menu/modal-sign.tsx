import { useAppContext } from "@/client/hud/app/context";
import { Modal, KeyboardButton, Box } from "@/ui";

export const ModalSign: React.FC = () => {
  const { sign, setSign, zoom, bottomOffset } = useAppContext();
  const hasIcon = sign?.icon !== "sign-blank";
  const icon = hasIcon ? `./assets/images/${sign?.icon}.png` : `./assets/icons/chat.png`;
  return (
    <Modal zoom={zoom} bottomOffset={bottomOffset}>
      <Modal.Header icon={icon}>{sign?.subject}</Modal.Header>
      <Modal.Body>
        <Box sx={{ maxWidth: 300, whiteSpace: "normal", lineHeight: 1.5 }}>{sign?.text}</Box>
      </Modal.Body>
      <Modal.Footer>
        <KeyboardButton sx={{ flex: 1 }} onClick={() => setSign(null)} keyboardKey="ESCAPE">
          Close
        </KeyboardButton>
      </Modal.Footer>
    </Modal>
  );
};
