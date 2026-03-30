import { useAppContext } from "./";
import { Modal, KeyboardButton, Icon } from "@aether/ui";
import UserSettingsForm from "./UserSettingsForm";

const ModalSettings: React.FC = () => {
  const { setTabSettings, zoom, bottomOffset } = useAppContext();

  return (
    <>
      <Modal.Overlay sx={{ backgroundColor: "shadow.50" }} onClick={() => setTabSettings(null)} />
      <Modal zoom={zoom} bottomOffset={bottomOffset}>
        <Modal.Header>
          <Icon icon={`./assets/icons/pen.png`} size={24} />
          Settings
        </Modal.Header>
        <Modal.Body>
          <UserSettingsForm />
        </Modal.Body>
        <Modal.Footer>
          <KeyboardButton
            sx={{ flex: 1 }}
            onClick={() => setTabSettings(null)}
            keyboardKey="ESCAPE"
          >
            Close
          </KeyboardButton>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ModalSettings;
