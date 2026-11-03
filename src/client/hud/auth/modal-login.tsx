import { useState, useCallback } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { Modal } from "@/ui/kit/modal";
import { Icon } from "@/ui/kit/icon";
import { Box } from "theme-ui";
import { VersionTag } from "@/ui/kit/version-tag";
import { Toast } from "@/ui/kit/toast";
import { Tooltip } from "@/ui/kit/tooltip";
import type { ToastMessage } from "@/ui/kit/toast";
import { useAppContext } from "@/client/hud/app/context";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import { DemoForm } from "./demo-form";
import type { FormSuccess, Notify } from "./login-types";

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
