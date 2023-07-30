import { useAppContext } from "./";
import { Modal, KeyboardButton, Icon, Box } from "@aether/ui";

const ModalError: React.FC = () => {
  const { error, setError, zoom, bottomOffset } = useAppContext();

  return (
    <>
      <Modal.Overlay />
      <Modal zoom={zoom} bottomOffset={bottomOffset}>
        <Modal.Header sx={{ paddingLeft: 34 }}>
          <Icon
            icon={"./assets/icons/danger.png"}
            size={42}
            sx={{ position: "absolute", left: 0 }}
          />
          {error?.title}
        </Modal.Header>
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

export default ModalError;
