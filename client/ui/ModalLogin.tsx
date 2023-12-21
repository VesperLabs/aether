import { useState, useEffect } from "react";
import { Modal, Flex, Input, KeyboardButton, Icon, Tooltip, Text, Box } from "@aether/ui";
import { useAppContext } from "./";
import { CLASS_ICON_MAP } from "@aether/shared";

const IconPen = ({ sx }: { sx?: any }) => (
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

const ModalLogin = (props: any) => {
  const storedEmail = localStorage.getItem("email");
  const { zoom, bottomOffset } = useAppContext();
  const [defaultEmail, setDefaultEmail] = useState(storedEmail);
  const [activeTab, setActiveTab] = useState(storedEmail ? "login" : "demo");
  const isLogin = activeTab === "login";
  const isRegister = activeTab === "register";
  const isDemo = activeTab === "demo";

  const onRegisterSuccess = (payload: any) => {
    setDefaultEmail(payload?.email);
    setTimeout(() => setActiveTab("login"), 100);
  };

  return (
    <Modal
      zoom={zoom}
      bottomOffset={bottomOffset}
      {...props}
      as="form"
      autoComplete="off"
      onSubmit={(e) => e.preventDefault()}
      sx={{ width: 220 }}
    >
      <Tooltip id="login" />
      <Modal.Header
        sx={{ cursor: "pointer", opacity: isLogin ? 1 : 0.25 }}
        onClick={() => setActiveTab("login")}
      >
        <IconPen sx={{ transform: isLogin ? "scale(1)" : "scale(0)" }} />
        <Icon size={22} icon={`./assets/icons/book.png`} />
        Login
      </Modal.Header>
      {isLogin && <LoginForm defaultEmail={defaultEmail} />}
      <Modal.Header
        sx={{ cursor: "pointer", opacity: isRegister ? 1 : 0.25 }}
        onClick={() => setActiveTab("register")}
      >
        <IconPen sx={{ transform: isRegister ? "scale(1)" : "scale(0)" }} />
        <Icon size={22} icon={`./assets/icons/book.png`} />
        Register
      </Modal.Header>
      {isRegister && <RegisterForm onRegisterSuccess={onRegisterSuccess} />}
      <Modal.Header
        sx={{ cursor: "pointer", opacity: isDemo ? 1 : 0.25 }}
        onClick={() => setActiveTab("demo")}
      >
        <IconPen sx={{ transform: isDemo ? "scale(1)" : "scale(0)" }} />
        <Icon size={22} icon={`./assets/icons/book.png`} />
        Try Demo
      </Modal.Header>
      {isDemo && <DemoForm />}
    </Modal>
  );
};

const DemoForm = () => {
  const { socket } = useAppContext();
  const [charClass, setCharClass] = useState("warrior");

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

const LoginForm = ({ defaultEmail }) => {
  const { socket } = useAppContext();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onFormError = (payload: any) => {
    setError(payload?.error);
    setIsLoading(false);
  };

  const handleLogin = () => {
    socket.emit("login", { email, password });
    localStorage.setItem("email", email);
    setIsLoading(true);
  };

  useEffect(() => {
    socket.on("formError", onFormError);

    return () => {
      socket.off("formError", onFormError);
    };
  }, [socket]);

  return (
    <Modal.Body sx={{ gap: 2 }}>
      <Input
        autoFocus={!defaultEmail}
        placeholder="Email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError("");
        }}
      />
      <Input
        autoFocus={defaultEmail}
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

const RegisterForm = ({ onRegisterSuccess }) => {
  const { socket } = useAppContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [charClass, setCharClass] = useState("warrior");

  const onFormError = (payload: any) => {
    setError(payload?.error);
  };

  const onFormSuccess = (payload: any) => {
    onRegisterSuccess(payload);
  };

  useEffect(() => {
    socket.on("formError", onFormError);
    return () => {
      socket.off("formError", onFormError);
    };
  }, [socket]);

  useEffect(() => {
    socket.on("formSuccess", onFormSuccess);
    return () => {
      socket.off("formSuccess", onFormSuccess);
    };
  }, [socket]);

  return (
    <Modal.Body sx={{ gap: 2 }}>
      <CharClassSelect charClass={charClass} setCharClass={setCharClass} />
      <Input
        autoFocus={true}
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

const ClickableIcon = ({ icon, setCharClass, charClass, isSelected }) => {
  const getDesc = (charClass) => {
    const desc = {
      warrior: "Warriors are strong and can take a lot of damage.",
      rogue: "Rogues are fast and can dodge attacks.",
      mage: "Mages are powerful spellcasters and can do heavy damage.",
      cleric: "Clerics are powerful healers but consume their own life-force in the process.",
    };
    return desc[charClass];
  };
  return (
    //@ts-ignore
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

const ErrorBox = ({ children }) => {
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

const CharClassSelect = ({ charClass, setCharClass }) => {
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

export default ModalLogin;
