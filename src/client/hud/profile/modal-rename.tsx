import { useState } from "react";
import { useAppContext } from "@/client/hud/app/context";
import { Modal, Button, Icon, Input, Portal } from "@/ui";

/** Renames your character in its own modal, out of the scrolling menu stack. */
export const ModalRename = ({ userName, onClose }: { userName: string; onClose: () => void }) => {
  const { socket, zoom, bottomOffset } = useAppContext();
  const [name, setName] = useState(userName);

  const save = () => {
    const next = name.trim();
    if (next && next !== userName) socket.emit("updateProfile", { userName: next });
    onClose();
  };

  return (
    <Portal container={document.body}>
      <Modal.Overlay sx={{ opacity: 0.5 }} onClick={onClose} />
      <Modal zoom={zoom} bottomOffset={bottomOffset}>
        <Modal.Header>
          <Icon icon="./assets/icons/pen.png" size={24} />
          Rename
        </Modal.Header>
        <Modal.Body>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <Input
              autoFocus
              sx={{ width: 200, fontSize: 4 }}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="wood" sx={{ flex: 1, justifyContent: "center" }} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="wood" sx={{ flex: 1, justifyContent: "center" }} onClick={save}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </Portal>
  );
};
