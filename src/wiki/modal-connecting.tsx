import { useState } from "react";
import { Modal, getHudZoomFor, useViewportSizeEffect } from "@/ui";

/** The zoom the game's HUD uses in a window this size, so this modal matches the game's. */
const getWindowZoom = () => getHudZoomFor(window.innerWidth, window.innerHeight);

/** Shown while the server wakes up, at the size the game would show its modals. */
export const ModalConnecting = () => {
  const [zoom, setZoom] = useState(getWindowZoom);
  useViewportSizeEffect(() => setZoom(getWindowZoom()));
  return (
    <>
      <Modal.Overlay />
      <Modal zoom={zoom} sx={{ maxWidth: 300 }}>
        <Modal.Header icon="./assets/icons/danger.png">Give'r a sec...</Modal.Header>
        <Modal.Body sx={{ whiteSpace: "normal", lineHeight: 1.5 }}>
          I'm on the free tier, so please be patient while the application spins up.
        </Modal.Body>
      </Modal>
    </>
  );
};
