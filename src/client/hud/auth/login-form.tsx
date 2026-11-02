import { useState, useEffect, useEffectEvent } from "react";
import { Modal, Input, KeyboardButton, Box, Switch } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import { useSavedLogin } from "./saved-login";
import { getLoginToken, getRememberMe, setRememberMe } from "./remembered-login";
import type { Notify } from "./login-types";

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
}: {
  defaultEmail: string;
  isActive: boolean;
  notify: Notify;
}) => {
  const { socket } = useAppContext();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remember, setRemember] = useState(getRememberMe);
  const [token, setToken] = useState(getLoginToken);
  /* A remembered login stands in for the password until the user types one or another email */
  const isRemembered = !!token && remember && !password && email === defaultEmail;
  const savedLogin = useSavedLogin((saved) => {
    /* Don't swap a just-registered email for an older saved one */
    if (defaultEmail && saved.email !== defaultEmail) return;
    setEmail(saved.email);
    setPassword(saved.password);
  });

  const onFormError = useEffectEvent((payload: { error: string }) => {
    if (!isActive) return;
    savedLogin.fail();
    setToken(getLoginToken());
    notify("error", payload?.error);
    setIsLoading(false);
  });

  const handleLogin = () => {
    if (isRemembered && token) {
      socket.emit("tokenLogin", { token });
    } else {
      socket.emit("login", { email, password, remember });
      savedLogin.attempt({ email, password });
    }
    localStorage.setItem("email", email);
    setIsLoading(true);
  };

  useEffect(() => {
    if (!isActive) return;
    const handleFormError = (payload: { error: string }) => onFormError(payload);
    socket.on("formError", handleFormError);
    return () => {
      socket.off("formError", handleFormError);
    };
  }, [socket, isActive]);

  return (
    <Modal.Body sx={{ gap: 2 }}>
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
      <Switch
        label="Remember me"
        checked={remember}
        onChange={(e) => {
          setRemember(e.target.checked);
          setRememberMe(e.target.checked);
        }}
      />
      <KeyboardButton
        sx={{ flex: 1 }}
        disabled={isLoading}
        onClick={() => handleLogin()}
        keyboardKey="ENTER"
      >
        Login
      </KeyboardButton>
    </Modal.Body>
  );
};
