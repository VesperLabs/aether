import { useAppContext } from "@/client/hud/app/context";
import { Modal, KeyboardButton, Icon, Box, Text } from "@/ui";

export const ModalHome = () => {
  const { zoom, bottomOffset, homeModal: keeper, setHomeModal, socket } = useAppContext();
  const icon = `./assets/icons/pen.png`;
  return keeper ? (
    <>
      <Modal.Overlay sx={{ backgroundColor: "shadow.50" }} />
      <Modal zoom={zoom} bottomOffset={bottomOffset}>
        <Modal.Header sx={{ paddingLeft: 34 }}>
          <Icon icon={icon} size={42} sx={{ position: "absolute", left: 0 }} />
          Please confirm
        </Modal.Header>
        <Modal.Body>
          <Box sx={{ maxWidth: 300, whiteSpace: "normal", lineHeight: 1.5 }}>
            You are about to make{" "}
            <Text color="set" sx={{ fontWeight: "bold" }}>
              {startCaseLower(keeper?.roomName)}
            </Text>{" "}
            your new home. When you die, you will respawn here.
          </Box>
        </Modal.Body>
        <Modal.Footer>
          <KeyboardButton
            sx={{ flex: 1 }}
            onClick={() => {
              socket.emit("setSpawn", {});
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
    </>
  ) : null;
};

/** Lowercases a room name and capitalises each word, splitting on non-alphanumerics and camelCase boundaries. */
function startCaseLower(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}
