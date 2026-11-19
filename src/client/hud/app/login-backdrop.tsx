import { useEffect, useState } from "react";
import { useAppContext } from "./context";
import { Box, LOGIN_RISE_SX } from "@/ui";
import { GameLogin } from "@/client/hud/auth/game-login";
import { WikiLink } from "@/client/hud/auth/wiki-link";
import { LoadingBar, useLoadProgress } from "@/client/hud/loading/loading-bar";
import { ModalError } from "@/client/hud/menu/modal-error";
import { LOGIN_FADE_MS } from "@/client/scenes/login-fade";
import { useWorldReady, WORLD_REVEAL_MS } from "./use-world-ready";

/** How long the black takes to clear from over the observed world. */
const WASH_FADE_MS = 1200;

/** The black cover: clear behind the login screen, closing at login and lifting once the hero's world has drawn. */
export function LoginBackdrop({
  isLoggedIn,
  isLoaded,
  hasTicket,
  hasError,
}: {
  isLoggedIn: boolean;
  isLoaded: boolean;
  /** Arrived logged in from the wiki: one loading bar until the world shows, no form unless refused. */
  hasTicket: boolean;
  hasError: boolean;
}) {
  const isWorldReady = useWorldReady(isLoggedIn);
  const loadProgress = useLoadProgress();
  const [isLifted, setIsLifted] = useState(false);
  const isRedeeming = useIsRedeeming(hasTicket);

  useEffect(() => {
    if (isLoggedIn) return;
    setIsLifted(false);
  }, [isLoggedIn]);

  /* From the very first frame, so the login form is simply there */
  const isCovering = !isLoggedIn || !isWorldReady;
  const isWashShown = !isLoggedIn && !isWorldReady;

  return (
    <Box
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && isWorldReady && isLoggedIn) setIsLifted(true);
      }}
      sx={{
        inset: 0,
        position: "fixed",
        backgroundColor: isLoggedIn ? "black" : "transparent",
        opacity: isCovering ? 1 : 0,
        transition: isCovering
          ? `opacity 1s ease-out, background-color ${LOGIN_FADE_MS}ms ease-in-out`
          : `opacity ${WORLD_REVEAL_MS}ms ease-in-out`,
        pointerEvents: "none",
        zIndex: "modal",
      }}
    >
      {/* Matches the page's own black, so the world fades in from it */}
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          backgroundColor: "black",
          opacity: isWashShown ? 1 : 0,
          transition: `opacity ${WASH_FADE_MS}ms ease-in`,
        }}
      />
      {/* Stays through the fade, so nothing changes mid-animation */}
      {/* The form comes in once the assets are down: until then, a bar shows how far they are */}
      {(!isLoaded || (isRedeeming && isCovering)) && <LoadingBar progress={loadProgress} />}
      {isLoaded && !isRedeeming && !isLifted && (
        <Box
          sx={{
            /* Fills the screen: the animated transform makes this what the fixed modal sits in */
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            opacity: isLoggedIn ? 0 : 1,
            transition: `opacity ${LOGIN_FADE_MS}ms ease-in-out`,
            ...LOGIN_RISE_SX,
          }}
        >
          <GameLogin />
        </Box>
      )}
      {/* Outside the form's box, so it stays put while the form slides in */}
      {!isLoggedIn && !isRedeeming && <WikiLink />}
      {hasError && <ModalError />}
    </Box>
  );
}

/** True while a wiki ticket is on its way in: false again only if the server refuses it. */
function useIsRedeeming(hasTicket: boolean) {
  const { socket } = useAppContext();
  const [isRedeeming, setIsRedeeming] = useState(hasTicket);
  useEffect(() => {
    if (!isRedeeming) return;
    const showForm = () => setIsRedeeming(false);
    socket.once("formError", showForm);
    return () => {
      socket.off("formError", showForm);
    };
  }, [socket, isRedeeming]);
  return isRedeeming;
}
