import { useEffect, useState } from "react";
import { Box } from "@/ui";
import { ModalLogin } from "@/client/hud/auth/modal-login";
import { ModalError } from "@/client/hud/menu/modal-error";
import { LOGIN_FADE_MS } from "@/client/scenes/login-fade";
import { useWorldReady, WORLD_REVEAL_MS } from "./use-world-ready";

/** Quick enough to finish before the observed world fades in behind it. */
const FORM_RISE_MS = 300;

/** The black cover: clear over the observed world, closing at login and lifting once the hero's world has drawn. */
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
  const isObserving = isWorldReady && !isLoggedIn;

  return (
    <Box
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && isWorldReady && isLoggedIn) setIsLifted(true);
      }}
      sx={{
        inset: 0,
        position: "fixed",
        backgroundColor: isObserving ? "transparent" : "black",
        opacity: isCovering ? 1 : 0,
        transition: isCovering
          ? `opacity 1s ease-out, background-color ${LOGIN_FADE_MS}ms ease-in-out`
          : `opacity ${WORLD_REVEAL_MS}ms ease-in-out`,
        pointerEvents: "none",
        zIndex: "modal",
      }}
    >
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
            animation: `loginFormRise ${FORM_RISE_MS}ms ease-out backwards`,
            "@keyframes loginFormRise": {
              from: { opacity: 0, transform: "translateY(24px)" },
              to: { opacity: 1, transform: "none" },
            },
          }}
        >
          <ModalLogin />
        </Box>
      )}
      {hasError && <ModalError />}
    </Box>
  );
}
