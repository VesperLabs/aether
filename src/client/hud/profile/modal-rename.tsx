import { useEffect, useEffectEvent, useState } from "react";
import { useAppContext } from "@/client/hud/app/context";
import { Modal, KeyboardButton, Icon, Input, Portal } from "@/ui";

/** Renames your character in its own modal, out of the scrolling menu stack. */
export const ModalRename = ({ userName, onClose }: { userName: string; onClose: () => void }) => {
  const { socket, zoom, bottomOffset } = useAppContext();
  const [name, setName] = useState(userName);

  /* Esc closes just this modal: caught first so the menus' Esc doesn't also close the profile */
  const close = useEffectEvent(onClose);
  useEffect(() => {
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close();
    };
    window.addEventListener("keyup", onKeyUp, true);
    return () => window.removeEventListener("keyup", onKeyUp, true);
  }, []);

  const save = () => {
    const next = name.trim();
    if (next && next !== userName) socket.emit("updateProfile", { userName: next });
    onClose();
  };

  return (
    <Portal container={document.body}>
      <Modal.Overlay sx={{ backgroundColor: "shadow.50" }} onClick={onClose} />
      <Modal zoom={zoom} bottomOffset={bottomOffset}>
        <Modal.Header>
          <Icon icon="./assets/icons/pen.png" size={24} />
          Your Name
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
          <KeyboardButton sx={{ flex: 1 }} onClick={onClose} keyboardKey="ESCAPE">
            Cancel
          </KeyboardButton>
          {/* Enter in the field submits the form; the key here shows it and serves taps */}
          <KeyboardButton sx={{ flex: 1 }} onClick={save} keyboardKey="ENTER">
            Save
          </KeyboardButton>
        </Modal.Footer>
      </Modal>
    </Portal>
  );
};
