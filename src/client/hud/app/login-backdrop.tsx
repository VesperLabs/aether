import { useEffect, useState } from "react";
import { Box, LOGIN_RISE_SX } from "@/ui";
import { GameLogin } from "@/client/hud/auth/game-login";
import { WikiLink } from "@/client/hud/auth/wiki-link";
import { ModalError } from "@/client/hud/menu/modal-error";
import { LOGIN_FADE_MS } from "@/client/scenes/login-fade";
import { useWorldReady, WORLD_REVEAL_MS } from "./use-world-ready";

/** How long the colour wash takes to clear from over the observed world. */
const WASH_FADE_MS = 1200;

/** The black cover: clear behind the login screen, closing at login and lifting once the hero's world has drawn. */
export function LoginBackdrop({
  isLoggedIn,
  hasError,
}: {
  isLoggedIn: boolean;
  hasError: boolean;
}) {
  const isWorldReady = useWorldReady(isLoggedIn);
  const [isLifted, setIsLifted] = useState(false);

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
      {/* Painted first by client/index.html, so the page never opens on black */}
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          background: "var(--login-wash)",
          opacity: isWashShown ? 1 : 0,
          transition: `opacity ${WASH_FADE_MS}ms ease-in`,
        }}
      />
      {/* Stays through the fade, so nothing changes mid-animation */}
      {!isLifted && (
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
      {!isLoggedIn && <WikiLink />}
      {hasError && <ModalError />}
    </Box>
  );
}
