import { useEffect, useState } from "react";
import { Box, Modal } from "@/ui";
import { ModalLogin } from "@/client/hud/auth/modal-login";
import { ModalError } from "@/client/hud/menu/modal-error";
import { useWorldReady, WORLD_REVEAL_MS } from "./use-world-ready";

/** The black cover with the title art, lifted once the player's world has drawn. */
export function LoginBackdrop({
  showLogin,
  isLoggedIn,
  hasError,
}: {
  showLogin: boolean;
  isLoggedIn: boolean;
  hasError: boolean;
}) {
  const isWorldReady = useWorldReady(isLoggedIn);
  const [isLifted, setIsLifted] = useState(false);

  useEffect(() => {
    if (isLoggedIn) return;
    setIsLifted(false);
  }, [isLoggedIn]);

  const isCovering = showLogin || (isLoggedIn && !isWorldReady);

  return (
    <Box
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && isWorldReady) setIsLifted(true);
      }}
      sx={{
        inset: 0,
        position: "fixed",
        backgroundColor: "black",
        opacity: isCovering ? 1 : 0,
        transition: isCovering
          ? "opacity 1s ease-out 0.5s"
          : `opacity ${WORLD_REVEAL_MS}ms ease-in-out`,
        pointerEvents: "none",
        zIndex: "modal",
      }}
    >
      <Modal.Overlay
        sx={{ backgroundImage: "url(./assets/images/bg.jpg)", pointerEvents: "none" }}
      />
      {/* Stays through the fade, so nothing changes mid-animation */}
      {!isLifted && <ModalLogin />}
      {hasError && <ModalError />}
    </Box>
  );
}
