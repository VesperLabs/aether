import { useAppContext } from "@/client/hud/app/context";
import { Modal } from "@/ui/kit/modal";
import { KeyboardButton } from "@/ui/kit/keyboard-button";
import { Icon } from "@/ui/kit/icon";
import { UserSettingsForm } from "./user-settings-form";

export const ModalSettings: React.FC = () => {
  const { setTabSettings, zoom, bottomOffset } = useAppContext();

  return (
    <>
      <Modal.Overlay sx={{ backgroundColor: "shadow.50" }} onClick={() => setTabSettings(false)} />
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
            onClick={() => setTabSettings(false)}
            keyboardKey="ESCAPE"
          >
            Close
          </KeyboardButton>
        </Modal.Footer>
      </Modal>
    </>
  );
};
