import { useState } from "react";
import {
  Flex,
  ModalLogin,
  getHudZoomFor,
  getLoginScale,
  LOGIN_RISE_SX,
  useViewportSizeEffect,
} from "@/ui";

/* Modals float over the page; this one sits in it, centred between the menu and the cards. */
const IN_PAGE = {
  position: "relative" as const,
  left: "auto",
  top: "auto",
  transform: "none",
  /* Over the menu, which its toast can reach */
  zIndex: 2,
};

/** The scale the game shows its login at in a window this size. */
const getWindowScale = () => getLoginScale(getHudZoomFor(window.innerWidth, window.innerHeight));

/** The game's login form, always on the page: a login carries you straight into the game. */
export const WikiLogin = () => {
  const [scale, setScale] = useState(getWindowScale);
  useViewportSizeEffect(() => setScale(getWindowScale()));
  return (
    <Flex
      sx={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        mt: 5,
        pb: 4,
        ...LOGIN_RISE_SX,
      }}
    >
      <ModalLogin
        /* `zoom`, not a transform: it takes up its real size, so it never runs into the menu or
           cards. */
        sx={{ ...IN_PAGE, zoom: scale }}
        /* In this tab: one opened after waiting on the server would be blocked as a popup */
        onTicket={(ticket) => window.location.assign(`${process.env.GAME_URL}#ticket=${ticket}`)}
      />
    </Flex>
  );
};
