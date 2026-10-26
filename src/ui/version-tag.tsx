import { createPortal } from "react-dom";
import { Text } from "theme-ui";

/** The build's version and commit, pinned to the bottom-right corner of the page. */
export const VersionTag = () =>
  createPortal(
    <Text
      sx={{
        position: "fixed",
        right: 2,
        bottom: 2,
        fontSize: 0,
        opacity: 0.5,
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 1000,
      }}
    >
      {__APP_VERSION__}
    </Text>,
    document.body,
  );
