import { useState, useEffect } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { Modal, Flex, Input, KeyboardButton, Icon, Text, Box, VersionTag } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import { CLASS_ICON_MAP, type CharClass } from "@/shared/content";
import { Tooltip } from "@/client/hud/tooltips/tooltip";

/** The `formSuccess` message from the server. */
type FormSuccess = { success: string; email?: string };

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
  const [defaultEmail, setDefaultEmail] = useState(storedEmail);
  const [activeTab, setActiveTab] = useState(storedEmail ? "login" : "demo");

  const isLogin = activeTab === "login";
  const isRegister = activeTab === "register";
  const isDemo = activeTab === "demo";

  const onRegisterSuccess = (payload: FormSuccess) => {
    setDefaultEmail(payload?.email ?? "");
    setTimeout(() => setActiveTab("login"), 100);
  };

  return (
    <Modal
      zoom={zoom}
      bottomOffset={bottomOffset}
      as="form"
      {...{ autoComplete: "off" }}
      onSubmit={(e) => e.preventDefault()}
      sx={{ width: 220 }}
    >
      <Tooltip id="login" />
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
        <LoginForm defaultEmail={defaultEmail} isActive={isLogin} />
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
        <RegisterForm onRegisterSuccess={onRegisterSuccess} isActive={isRegister} />
      </TabPanel>
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
      <ErrorBox>
        Note: your progress will not be saved. For that you will need to click "Register".
      </ErrorBox>
      <KeyboardButton sx={{ flex: 1 }} onClick={() => handleDemoLogin()} keyboardKey="ENTER">
        Play
      </KeyboardButton>
    </Modal.Body>
  );
};

const LoginForm = ({ defaultEmail, isActive }: { defaultEmail: string; isActive: boolean }) => {
  const { socket } = useAppContext();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onFormError = (payload: { error: string }) => {
    if (!isActive) return;
    setError(payload?.error);
    setIsLoading(false);
  };

  const handleLogin = () => {
    socket.emit("login", { email, password });
    localStorage.setItem("email", email);
    setIsLoading(true);
  };

  useEffect(() => {
    if (!isActive) return;
    socket.on("formError", onFormError);
    return () => {
      socket.off("formError", onFormError);
    };
  }, [socket, isActive]);

  return (
    <Modal.Body sx={{ gap: 2 }}>
      <Input
        autoFocus={isActive && !defaultEmail}
        placeholder="Email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError("");
        }}
      />
      <Input
        autoFocus={isActive && !!defaultEmail}
        autoComplete="weak-password"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError("");
        }}
      />
      <ErrorBox>{error}</ErrorBox>
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
}: {
  onRegisterSuccess: (payload: FormSuccess) => void;
  isActive: boolean;
}) => {
  const { socket } = useAppContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [charClass, setCharClass] = useState<CharClass>("warrior");

  const onFormError = (payload: { error: string }) => {
    if (!isActive) return;
    setError(payload?.error);
  };

  const onFormSuccess = (payload: FormSuccess) => {
    if (!isActive) return;
    onRegisterSuccess(payload);
  };

  useEffect(() => {
    if (!isActive) return;
    socket.on("formError", onFormError);
    return () => {
      socket.off("formError", onFormError);
    };
  }, [socket, isActive]);

  useEffect(() => {
    if (!isActive) return;
    socket.on("formSuccess", onFormSuccess);
    return () => {
      socket.off("formSuccess", onFormSuccess);
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
          setError("");
        }}
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError("");
        }}
      />
      <ErrorBox>{error}</ErrorBox>
      <KeyboardButton
        sx={{ flex: 1 }}
        onClick={() => socket.emit("register", { email, password, charClass })}
        keyboardKey="ENTER"
      >
        Register
      </KeyboardButton>
    </Modal.Body>
  );
};

interface ClickableIconProps {
  icon: string;
  setCharClass: (charClass: CharClass) => void;
  charClass: CharClass;
  isSelected: boolean;
}

const ClickableIcon = ({ icon, setCharClass, charClass, isSelected }: ClickableIconProps) => {
  const getDesc = (charClass: CharClass) => {
    const desc: Record<CharClass, string> = {
      warrior: "Warriors are strong and can take a lot of damage.",
      rogue: "Rogues are fast and can dodge attacks.",
      mage: "Mages are powerful spellcasters and can do heavy damage.",
      cleric: "Clerics are powerful healers but consume their own life-force in the process.",
    };
    return desc[charClass];
  };
  return (
    <Flex
      data-tooltip-id="login"
      data-tooltip-content={getDesc(charClass)}
      sx={{
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        opacity: isSelected ? 1 : 0.15,
        gap: 1,
        "&:hover": {
          opacity: isSelected ? 1 : 0.65,
        },
      }}
      onClick={() => setCharClass(charClass)}
    >
      <Icon size={22} icon={icon} />
      <Text sx={{ fontSize: 0, textTransform: "capitalize" }}>{charClass}</Text>
    </Flex>
  );
};

const ErrorBox = ({ children }: { children?: React.ReactNode }) => {
  return (
    <Flex
      sx={{
        borderRadius: 3,
        background: "shadow.10",
        alignItems: "center",
        justifyContent: "center",
        color: "danger",
        minHeight: 30,
        p: 2,
        whiteSpace: "normal",
        fontSize: 1,
      }}
    >
      {children}
    </Flex>
  );
};

const CharClassSelect = ({
  charClass,
  setCharClass,
}: {
  charClass: CharClass;
  setCharClass: (charClass: CharClass) => void;
}) => {
  return (
    <Flex sx={{ justifyContent: "space-around", pb: 2 }}>
      <ClickableIcon
        icon={CLASS_ICON_MAP.WARRIOR}
        charClass="warrior"
        isSelected={charClass === "warrior"}
        setCharClass={setCharClass}
      />
      <ClickableIcon
        icon={CLASS_ICON_MAP.ROGUE}
        charClass="rogue"
        isSelected={charClass === "rogue"}
        setCharClass={setCharClass}
      />
      <ClickableIcon
        icon={CLASS_ICON_MAP.MAGE}
        charClass="mage"
        isSelected={charClass === "mage"}
        setCharClass={setCharClass}
      />
      <ClickableIcon
        icon={CLASS_ICON_MAP.CLERIC}
        charClass="cleric"
        isSelected={charClass === "cleric"}
        setCharClass={setCharClass}
      />
    </Flex>
  );
};
