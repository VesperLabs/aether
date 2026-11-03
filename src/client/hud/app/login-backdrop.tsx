import { Box } from "theme-ui";
import { Modal } from "@/ui/kit/modal";
import { ModalLogin } from "@/client/hud/auth/modal-login";
import { ModalError } from "@/client/hud/menu/modal-error";

/** The black cover with the title art that fades out once the player is logged in. */
export function LoginBackdrop({
  showLogin,
  isLoggedIn,
  hasError,
}: {
  showLogin: boolean;
  isLoggedIn: boolean;
  hasError: boolean;
}) {
  return (
    <Box
      sx={{
        inset: 0,
        position: "fixed",
        backgroundColor: "black",
        opacity: showLogin ? 1 : 0,
        transition: "opacity 1s ease-out",
        pointerEvents: "none",
        zIndex: "modal",
        transitionDelay: "0.5s",
      }}
    >
      <Modal.Overlay
        sx={{ backgroundImage: "url(./assets/images/bg.jpg)", pointerEvents: "none" }}
      />
      {!isLoggedIn && <ModalLogin />}
      {hasError && <ModalError />}
    </Box>
  );
}
