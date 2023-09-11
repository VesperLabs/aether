import { useAppContext } from "./";
import { Modal, KeyboardButton, Icon, Box, Text } from "@aether/ui";
import { startCase, toLower } from "lodash";

const ModalHome = () => {
  const { zoom, bottomOffset, homeModal: keeper, setHomeModal, socket } = useAppContext();
  const icon = `./assets/icons/pen.png`;
  return keeper ? (
    <Modal zoom={zoom} bottomOffset={bottomOffset}>
      <Modal.Header sx={{ paddingLeft: 34 }}>
        <Icon icon={icon} size={42} sx={{ position: "absolute", left: 0 }} />
        Please confirm
      </Modal.Header>
      <Modal.Body>
        <Box sx={{ maxWidth: 300, whiteSpace: "normal", lineHeight: 1.5 }}>
          You are about to make{" "}
          <Text color="set" sx={{ fontWeight: "bold" }}>
            {startCase(toLower(keeper?.roomName))}
          </Text>{" "}
          your new home. When you die, you will respawn here.
        </Box>
      </Modal.Body>
      <Modal.Footer>
        <KeyboardButton
          sx={{ flex: 1 }}
          onClick={() => {
            socket.emit("setSpawn", {
              x: keeper?.keeperData?.home?.x,
              y: keeper?.keeperData?.home?.y,
              roomName: keeper?.roomName,
            } as SpawnPoint);
            setHomeModal(null);
          }}
          keyboardKey="ENTER"
        >
          Okay
        </KeyboardButton>
        <KeyboardButton sx={{ flex: 1 }} onClick={() => setHomeModal(null)} keyboardKey="ESCAPE">
          Close
        </KeyboardButton>
      </Modal.Footer>
    </Modal>
  ) : null;
};

export default ModalHome;
