import { useState } from "react";
import { Modal, Input, KeyboardButton } from "@/ui/kit";
import type { CharClass } from "@/content";
import { CharClassSelect } from "./char-class-select";
import { GenderRow, type Gender } from "./gender-switch";
import { getRememberMe, rememberLoginToken } from "./remembered-login";
import { registerAccount } from "./auth-api";
import type { Notify } from "./login-types";

export const RegisterForm = ({
  onRegisterSuccess,
  isActive,
  notify,
}: {
  onRegisterSuccess: (email: string) => void;
  isActive: boolean;
  notify: Notify;
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [charClass, setCharClass] = useState<CharClass>("warrior");
  const [gender, setGender] = useState<Gender>("female");

  const handleRegister = async () => {
    if (!email) return;
    try {
      const result = await registerAccount({
        email,
        password,
        charClass,
        gender,
        remember: getRememberMe(),
      });
      if ("error" in result) throw new Error(result.error);
      if (result.token) rememberLoginToken(result.token);
      onRegisterSuccess(result.email);
    } catch (error) {
      notify("error", (error as Error).message);
    }
  };

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
      <GenderRow gender={gender} setGender={setGender} />
      <KeyboardButton
        sx={{ flex: 1 }}
        /* Hidden tabs stay mounted, and ENTER presses every enabled button on the page */
        disabled={!isActive}
        onClick={handleRegister}
        keyboardKey="ENTER"
      >
        Register
      </KeyboardButton>
    </Modal.Body>
  );
};
