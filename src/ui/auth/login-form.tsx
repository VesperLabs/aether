import { useState } from "react";
import { Modal, Input, KeyboardButton, Box } from "@/ui/kit";
import { CharacterPreview } from "./character-preview";
import { RememberRow } from "./remember-row";
import { useCharacterLookup } from "./use-character-lookup";
import { useSavedLogin } from "./saved-login";
import {
  forgetLoginToken,
  getLoginToken,
  getRememberMe,
  rememberLoginToken,
  setRememberMe,
} from "./remembered-login";
import { loginWithPassword, loginWithToken } from "./auth-api";
import type { Notify, OnTicket } from "./login-types";

/** Stands in for the password while a remembered login is kept; never sent anywhere. */
const REMEMBERED_PASSWORD = "remembered";

const RememberedCheck = () => (
  <Box
    data-tooltip-id="login"
    data-tooltip-content="Password remembered"
    sx={{
      position: "absolute",
      right: 2,
      top: "50%",
      transform: "translateY(-50%)",
      color: "set",
      lineHeight: 0,
    }}
  >
    <svg width={12} height={12} viewBox="0 0 16 16" aria-label="Password remembered">
      <path
        d="M3 8.5l3 3 7-7"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </Box>
);

export const LoginForm = ({
  defaultEmail,
  isActive,
  notify,
  onTicket,
}: {
  defaultEmail: string;
  isActive: boolean;
  notify: Notify;
  onTicket: OnTicket;
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remember, setRemember] = useState(getRememberMe);
  const [token, setToken] = useState(getLoginToken);
  /* A remembered login stands in for the password until the user types one or another email */
  const isRemembered = !!token && remember && !password && email === defaultEmail;
  const character = useCharacterLookup(email, isActive);
  const saveLogin = useSavedLogin((saved) => {
    /* Don't swap a just-registered email for an older saved one */
    if (defaultEmail && saved.email !== defaultEmail) return;
    setEmail(saved.email);
    setPassword(saved.password);
  });

  const handleLogin = async () => {
    if (!isRemembered && (!email || !password)) return;
    setIsLoading(true);
    try {
      const result =
        isRemembered && token
          ? await loginWithToken(token)
          : await loginWithPassword({ email, password, remember });
      if ("expired" in result && result.expired) {
        forgetLoginToken();
        setToken(null);
      }
      if ("error" in result) throw new Error(result.error);
      if (result.token) rememberLoginToken(result.token);
      if (!isRemembered) saveLogin({ email, password });
      localStorage.setItem("email", email);
      await onTicket(result.ticket);
    } catch (error) {
      notify("error", (error as Error).message);
      setIsLoading(false);
    }
  };

  return (
    <Modal.Body sx={{ gap: 2 }}>
      <CharacterPreview character={character} isActive={isActive} />
      <Input
        autoFocus={isActive && !defaultEmail}
        name="email"
        autoComplete="username"
        placeholder="Email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
        }}
      />
      <Box sx={{ position: "relative" }}>
        <Input
          autoFocus={isActive && !!defaultEmail}
          name="password"
          autoComplete="current-password"
          type="password"
          placeholder="Password"
          value={isRemembered ? REMEMBERED_PASSWORD : password}
          sx={{ pr: isRemembered ? 4 : undefined }}
          onChange={(e) => {
            const { value } = e.target;
            if (!isRemembered) return setPassword(value);
            /* Typing replaces the remembered dots; deleting any of them forgets the login */
            setToken(null);
            setPassword(
              value.startsWith(REMEMBERED_PASSWORD) ? value.slice(REMEMBERED_PASSWORD.length) : "",
            );
          }}
        />
        {isRemembered && <RememberedCheck />}
      </Box>
      <RememberRow
        checked={remember}
        onChange={(checked) => {
          setRemember(checked);
          setRememberMe(checked);
        }}
      />
      <KeyboardButton
        sx={{ flex: 1 }}
        /* Hidden tabs stay mounted, and ENTER presses every enabled button on the page */
        disabled={isLoading || !isActive}
        onClick={() => handleLogin()}
        keyboardKey="ENTER"
      >
        Login
      </KeyboardButton>
    </Modal.Body>
  );
};
