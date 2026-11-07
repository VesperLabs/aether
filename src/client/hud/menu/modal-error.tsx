import { useAppContext } from "@/client/hud/app/context";
import { Modal, KeyboardButton, Box } from "@/ui";

export const ModalError: React.FC = () => {
  const { error, setError, zoom, bottomOffset } = useAppContext();

  return (
    <>
      <Modal.Overlay />
      <Modal zoom={zoom} bottomOffset={bottomOffset}>
        <Modal.Header icon="./assets/icons/danger.png">{error?.title}</Modal.Header>
        <Modal.Body>
          <Box sx={{ maxWidth: 300, whiteSpace: "normal", lineHeight: 1.5 }}>
            {error?.description}
          </Box>
        </Modal.Body>
        <Modal.Footer>
          <KeyboardButton sx={{ flex: 1 }} onClick={() => setError(null)} keyboardKey="ESCAPE">
            Close
          </KeyboardButton>
        </Modal.Footer>
      </Modal>
    </>
  );
};
