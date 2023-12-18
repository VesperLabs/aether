import { isMobile } from "../../shared/utils";
import { useAppContext } from "./";
import { Modal, KeyboardButton, Icon, Switch, Flex } from "@aether/ui";

const ModalSettings: React.FC = () => {
  const { setTabSettings, userSettings, zoom, bottomOffset, socket } = useAppContext();
  const { showMinimap, playMusic } = userSettings ?? {};
  return (
    <>
      <Modal.Overlay sx={{ backgroundColor: "shadow.50" }} />
      <Modal zoom={zoom} bottomOffset={bottomOffset}>
        <Modal.Header>
          <Icon icon={`./assets/icons/pen.png`} size={24} />
          Settings
        </Modal.Header>
        <Modal.Body>
          <Flex
            sx={{
              flexDirection: "column",
              maxWidth: 300,
              minWidth: 200,
              gap: 2,
            }}
          >
            {!isMobile && (
              <Switch
                label={`Minimap: ${showMinimap ? "ON" : "OFF"}`}
                checked={showMinimap}
                onChange={(e) => {
                  socket.emit("updateUserSetting", {
                    name: "showMinimap",
                    value: e.target.checked,
                  });
                }}
              />
            )}
            <Switch
              label={`Music: ${playMusic ? "ON" : "OFF"}`}
              checked={playMusic}
              onChange={(e) => {
                socket.emit("updateUserSetting", {
                  name: "playMusic",
                  value: e.target.checked,
                });
              }}
            />
          </Flex>
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
