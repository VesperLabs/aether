import { isMobile } from "../../shared/utils";
import { useAppContext } from "./";
import { Modal, KeyboardButton, Icon, Switch, Flex } from "@aether/ui";
import TextDivider from "./TextDivider";

const ModalSettings: React.FC = () => {
  const { setTabSettings, userSettings, zoom, bottomOffset, socket } = useAppContext();
  const { showMinimap, playMusic, videoChat, charLevels } = userSettings ?? {};
  return (
    <>
      <Modal.Overlay sx={{ backgroundColor: "shadow.50" }} onClick={() => setTabSettings(null)} />
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
              minWidth: 220,
              justifyContent: "end",
              gap: 2,
              fontSize: 1,
              "& label ": {
                alignItems: "center",
                lineHeight: 1,
              },
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
            <Switch
              label={`Show Character Levels: ${charLevels ? "ON" : "OFF"}`}
              checked={charLevels}
              onChange={(e) => {
                socket.emit("updateUserSetting", {
                  name: "charLevels",
                  value: e.target.checked,
                });
              }}
            />
            <TextDivider color="#d5c1a7" sx={{ textAlign: "left" }}>
              🧪 Experimental
            </TextDivider>
            <Switch
              label={`Video Chat: ${videoChat ? "ON" : "OFF"}`}
              checked={videoChat}
              onChange={(e) => {
                socket.emit("updateUserSetting", {
                  name: "videoChat",
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
