import { useEffect, useState } from "react";
import { ModalLogin, getLoginScale } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import { hasPlayTicket } from "@/client/net/play-ticket";
import { DemoForm } from "./demo-form";

/** The login form in the game: a login enters the world on this connection. */
export const GameLogin = () => {
  const { socket, zoom, bottomOffset } = useAppContext();
  /* Arriving from the wiki, the form only shows if the ticket is refused */
  const [isRedeeming, setIsRedeeming] = useState(hasPlayTicket);
  useEffect(() => {
    if (!isRedeeming) return;
    const showForm = () => setIsRedeeming(false);
    socket.once("formError", showForm);
    return () => {
      socket.off("formError", showForm);
    };
  }, [socket, isRedeeming]);

  if (isRedeeming) return null;
  return (
    <ModalLogin
      zoom={getLoginScale(zoom)}
      bottomOffset={bottomOffset}
      /* Demo logins are for development only; the server refuses them in production */
      renderDemo={import.meta.env.DEV ? (isActive) => <DemoForm isActive={isActive} /> : undefined}
      onTicket={(ticket) =>
        new Promise((_, reject) => {
          /* A success unmounts the form, so only a refusal has anything to say */
          socket.once("formError", ({ error }) => reject(new Error(error)));
          socket.emit("ticketLogin", { ticket });
        })
      }
    />
  );
};
