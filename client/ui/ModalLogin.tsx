import { useState, useEffect } from "react";
import { Modal, Flex, Input, KeyboardButton, Icon, Tooltip, Text } from "@aether/ui";
import { useAppContext, ICONS } from "./";

const IconPen = ({ sx }: { sx?: any }) => (
  <Icon
    size={22}
    icon={`../assets/icons/pen.png`}
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
  const { zoom, bottomOffset } = useAppContext();
  const [activeTab, setActiveTab] = useState("login");
  const [defaultEmail, setDefaultEmail] = useState(localStorage.getItem("email"));
  const isLogin = activeTab === "login";
  const isRegister = activeTab === "register";

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
    >
      <Tooltip id="login" />
      <Modal.Header
        sx={{ cursor: "pointer", opacity: isLogin ? 1 : 0.25 }}
        onClick={() => setActiveTab("login")}
      >
        <IconPen sx={{ transform: isLogin ? "scale(1)" : "scale(0)" }} />
        <Icon size={22} icon={`../assets/icons/book.png`} />
        Login
      </Modal.Header>
      {isLogin && <LoginForm defaultEmail={defaultEmail} />}
      <Modal.Header
        sx={{ cursor: "pointer", opacity: isRegister ? 1 : 0.25 }}
        onClick={() => setActiveTab("register")}
      >
        <IconPen sx={{ transform: isRegister ? "scale(1)" : "scale(0)" }} />
        <Icon size={22} icon={`../assets/icons/book.png`} />
        Register
      </Modal.Header>
      {isRegister && <RegisterForm onRegisterSuccess={onRegisterSuccess} />}
    </Modal>
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
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError("");
        }}
      />
      <Flex
        sx={{
          borderRadius: 3,
          background: "shadow.10",
          alignItems: "center",
          justifyContent: "center",
          color: "danger",
          height: 30,
        }}
      >
        {error}
      </Flex>
      <KeyboardButton
        sx={{ flex: 1 }}
        disabled={isLoading}
        onClick={() => {
          socket.emit("login", { email, password });
          localStorage.setItem("email", email);
          setIsLoading(true);
        }}
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
      <Flex sx={{ justifyContent: "space-around", pb: 2 }}>
        <ClickableIcon
          icon={ICONS.WARRIOR}
          charClass="warrior"
          isSelected={charClass === "warrior"}
          setCharClass={setCharClass}
        />
        <ClickableIcon
          icon={ICONS.ROGUE}
          charClass="rogue"
          isSelected={charClass === "rogue"}
          setCharClass={setCharClass}
        />
        <ClickableIcon
          icon={ICONS.MAGE}
          charClass="mage"
          isSelected={charClass === "mage"}
          setCharClass={setCharClass}
        />
        {/* <ClickableIcon
          icon={ICONS.CLERIC}
          charClass="cleric"
          isSelected={charClass === "cleric"}
          setCharClass={setCharClass}
        /> */}
      </Flex>
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
      <Flex
        sx={{
          borderRadius: 3,
          background: "shadow.10",
          alignItems: "center",
          justifyContent: "center",
          color: "danger",
          height: 30,
        }}
      >
        {error}
      </Flex>
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
      mage: "Mages are powerful and can cast spells.",
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

export default ModalLogin;
