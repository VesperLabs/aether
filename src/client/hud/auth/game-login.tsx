import { ModalLogin, getLoginScale } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import { DemoForm } from "./demo-form";

/** The login form in the game: a login enters the world on this connection. */
export const GameLogin = () => {
  const { socket, zoom, bottomOffset } = useAppContext();
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
