import { useState, useEffect, useEffectEvent, useCallback } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { Modal, Input, KeyboardButton, Icon, Text, Box, VersionTag, Switch, Toast } from "@/ui";
import type { ToastKind, ToastMessage } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import type { CharClass } from "@/content";
import { Tooltip } from "@/ui";
import { useSavedLogin } from "./saved-login";
import { CharClassSelect } from "./char-class-select";
import { getLoginToken, getRememberMe, setRememberMe } from "./remembered-login";

/** The `formSuccess` message from the server. */
type FormSuccess = { success: string; email?: string };

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

type Notify = (kind: ToastKind, message: string) => void;

const accordionEase = "cubic-bezier(0.33, 1, 0.68, 1)";
const accordionDuration = "0.3s";

/** Single open panel; collapsed rows use 0fr height (see TabPanel). */
const TabPanel = ({ open, children }: { open: boolean; children: React.ReactNode }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateRows: open ? "1fr" : "0fr",
      transition: `grid-template-rows ${accordionDuration} ${accordionEase}`,
      "@media (prefers-reduced-motion: reduce)": {
        transition: "none",
      },
    }}
  >
    <Box
      sx={{
        minHeight: 0,
        overflow: "hidden",
        pointerEvents: open ? "auto" : "none",
        opacity: open ? 1 : 0,
        transition: `opacity ${accordionDuration} ${accordionEase}`,
        "@media (prefers-reduced-motion: reduce)": {
          transition: "none",
        },
      }}
      aria-hidden={!open}
    >
      {children}
    </Box>
  </Box>
);

const IconPen = ({ sx }: { sx?: ThemeUIStyleObject }) => (
  <Icon
    size={22}
    icon={`./assets/icons/pen.png`}
    sx={{
      position: "absolute",
      mt: "-27px",
      ml: "-12px",
      transition: ".2s ease all",
      ...sx,
    }}
  />
);

export const ModalLogin = () => {
  const storedEmail = localStorage.getItem("email") ?? "";
  const { zoom, bottomOffset } = useAppContext();
  /* Demo logins are for development only; the server refuses them in production */
  const canDemo = import.meta.env.DEV;
  const [defaultEmail, setDefaultEmail] = useState(storedEmail);
  const [activeTab, setActiveTab] = useState(storedEmail || !canDemo ? "login" : "demo");

  const isLogin = activeTab === "login";
  const isRegister = activeTab === "register";
  const isDemo = activeTab === "demo";

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const notify: Notify = (kind, message) => setToast({ id: Date.now(), kind, message });
  const dismissToast = useCallback(() => setToast(null), []);

  const onRegisterSuccess = (payload: FormSuccess) => {
    notify("success", payload?.success ?? "Account created");
    setDefaultEmail(payload?.email ?? "");
    setTimeout(() => setActiveTab("login"), 100);
  };

  return (
    <Modal
      zoom={zoom}
      bottomOffset={bottomOffset}
      as="form"
      onSubmit={(e) => e.preventDefault()}
      sx={{ width: 220 }}
    >
      <Tooltip id="login" />
      <Toast toast={toast} onDismiss={dismissToast} zoom={zoom} />
      <VersionTag />
      <Modal.Header
        sx={{ cursor: "pointer", opacity: isLogin ? 1 : 0.25 }}
        onClick={() => setActiveTab("login")}
      >
        <IconPen sx={{ transform: isLogin ? "scale(1)" : "scale(0)" }} />
        <Icon size={22} icon={`./assets/icons/book.png`} />
        Login
      </Modal.Header>
      <TabPanel open={isLogin}>
        {/* Keyed by email, so a new account's email and remembered login fill the form */}
        <LoginForm
          key={defaultEmail}
          defaultEmail={defaultEmail}
          isActive={isLogin}
          notify={notify}
        />
      </TabPanel>
      <Modal.Header
        sx={{ cursor: "pointer", opacity: isRegister ? 1 : 0.25 }}
        onClick={() => setActiveTab("register")}
      >
        <IconPen sx={{ transform: isRegister ? "scale(1)" : "scale(0)" }} />
        <Icon size={22} icon={`./assets/icons/book.png`} />
        Register
      </Modal.Header>
      <TabPanel open={isRegister}>
        <RegisterForm onRegisterSuccess={onRegisterSuccess} isActive={isRegister} notify={notify} />
      </TabPanel>
      {canDemo && (
        <>
          <Modal.Header
            sx={{ cursor: "pointer", opacity: isDemo ? 1 : 0.25 }}
            onClick={() => setActiveTab("demo")}
          >
            <IconPen sx={{ transform: isDemo ? "scale(1)" : "scale(0)" }} />
            <Icon size={22} icon={`./assets/icons/book.png`} />
            Try Demo
          </Modal.Header>
          <TabPanel open={isDemo}>
            <DemoForm />
          </TabPanel>
        </>
      )}
    </Modal>
  );
};

const DemoForm = () => {
  const { socket } = useAppContext();
  const [charClass, setCharClass] = useState<CharClass>("warrior");

  const handleDemoLogin = () => {
    socket.emit("demoLogin", { charClass });
  };

  return (
    <Modal.Body sx={{ gap: 2 }}>
      <CharClassSelect charClass={charClass} setCharClass={setCharClass} />
      <Text sx={{ fontSize: 1, opacity: 0.6, whiteSpace: "normal", textAlign: "center" }}>
        Note: your progress will not be saved. For that you will need to click "Register".
      </Text>
      <KeyboardButton sx={{ flex: 1 }} onClick={() => handleDemoLogin()} keyboardKey="ENTER">
        Play
      </KeyboardButton>
    </Modal.Body>
  );
};

const LoginForm = ({
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

const RegisterForm = ({
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
