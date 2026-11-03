import { useState, useEffect, useEffectEvent } from "react";
import { Modal } from "@/ui/kit/modal";
import { Input } from "@/ui/kit/input";
import { KeyboardButton } from "@/ui/kit/keyboard-button";
import { useAppContext } from "@/client/hud/app/context";
import type { CharClass } from "@/content/stats/stats";
import { CharClassSelect } from "./char-class-select";
import { getRememberMe } from "./remembered-login";
import type { FormSuccess, Notify } from "./login-types";

export const RegisterForm = ({
  onRegisterSuccess,
  isActive,
  notify,
}: {
  onRegisterSuccess: (payload: FormSuccess) => void;
  isActive: boolean;
  notify: Notify;
}) => {
  const { socket } = useAppContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [charClass, setCharClass] = useState<CharClass>("warrior");

  const onFormError = useEffectEvent((payload: { error: string }) => {
    if (!isActive) return;
    notify("error", payload?.error);
  });

  const onFormSuccess = useEffectEvent((payload: FormSuccess) => {
    if (!isActive) return;
    onRegisterSuccess(payload);
  });

  useEffect(() => {
    if (!isActive) return;
    const handleFormError = (payload: { error: string }) => onFormError(payload);
    socket.on("formError", handleFormError);
    return () => {
      socket.off("formError", handleFormError);
    };
  }, [socket, isActive]);

  useEffect(() => {
    if (!isActive) return;
    const handleFormSuccess = (payload: FormSuccess) => onFormSuccess(payload);
    socket.on("formSuccess", handleFormSuccess);
    return () => {
      socket.off("formSuccess", handleFormSuccess);
    };
  }, [socket, isActive]);

  return (
    <Modal.Body sx={{ gap: 2 }}>
      <CharClassSelect charClass={charClass} setCharClass={setCharClass} />
      <Input
        autoFocus={isActive}
        placeholder="Email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
        }}
      />
      <Input
        type="password"
        autoComplete="new-password"
        placeholder="Password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
        }}
      />
      <KeyboardButton
        sx={{ flex: 1 }}
        onClick={() =>
          socket.emit("register", { email, password, charClass, remember: getRememberMe() })
        }
        keyboardKey="ENTER"
      >
        Register
      </KeyboardButton>
    </Modal.Body>
  );
};
