import { useState, useCallback, type ComponentProps, type ReactNode } from "react";
import { Modal, Icon, Box, Flex, Grid, VersionTag, Toast, Tooltip } from "@/ui/kit";
import type { ToastMessage } from "@/ui/kit";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import { CHAR_CLASS_SELECT } from "./char-class-select";
import type { Notify, OnTicket } from "./login-types";

type LoginTab = "login" | "register" | "demo";

const FIRST_AFTER_SELECTOR = `& > .modal-body > :first-child:not(.${CHAR_CLASS_SELECT}), & > .modal-body > .${CHAR_CLASS_SELECT} + *`;

/* All stacked in one cell, so the modal takes the tallest form's size whichever is showing, and
   stay mounted, so switching tabs keeps what was typed. The button sits flush with the bottom, the
   top slot above the rest, and whatever is between them centered in the space left. */
const TabPanel = ({
  open,
  flush,
  children,
}: {
  open: boolean;
  flush: boolean;
  children: React.ReactNode;
}) => (
  <Box
    aria-hidden={!open}
    sx={{
      gridArea: "1 / 1",
      display: "flex",
      visibility: open ? "visible" : "hidden",
      "& > .modal-body": {
        flex: 1,
        borderRadius: Modal.tabPanelRadius(flush),
      },
      "& > .modal-body > *": { flex: "none" },
      "& > .modal-body > button": { mt: "auto" },
      [FIRST_AFTER_SELECTOR]: { mt: "auto" },
    }}
  >
    {children}
  </Box>
);

const ICON_SIZE = 22;

/* The login is boosted 1.2x, so its tabs come out the size of every other modal header. */
const LOGIN_TAB_SX = { fontSize: 1 };
const ICON_MOTION = ".2s ease all";

/* The book opens up on the active tab, and the feather pops onto it. */
const TabIcon = ({ active }: { active: boolean }) => (
  <Box
    sx={{
      position: "relative",
      width: active ? ICON_SIZE : 0,
      height: ICON_SIZE,
      transition: ICON_MOTION,
    }}
  >
    <Icon
      size={ICON_SIZE}
      icon={`./assets/icons/book.png`}
      sx={{ transform: active ? "scale(1)" : "scale(0)", transition: ICON_MOTION }}
    />
    <Icon
      size={ICON_SIZE}
      icon={`./assets/icons/pen.png`}
      sx={{
        position: "absolute",
        top: "-13.5px",
        left: "-12px",
        transform: active ? "scale(1)" : "scale(0)",
        transition: ICON_MOTION,
      }}
    />
  </Box>
);

/** The login, register and (where given) demo tabs. The app decides what a login leads to. */
export const ModalLogin = ({
  onTicket,
  renderDemo,
  sx,
  ...props
}: Pick<ComponentProps<typeof Modal>, "zoom" | "bottomOffset" | "sx"> & {
  onTicket: OnTicket;
  renderDemo?: (isActive: boolean) => ReactNode;
}) => {
  const storedEmail = localStorage.getItem("email") ?? "";
  const canDemo = !!renderDemo;
  const [defaultEmail, setDefaultEmail] = useState(storedEmail);
  const [activeTab, setActiveTab] = useState<LoginTab>(storedEmail || !canDemo ? "login" : "demo");

  const isLogin = activeTab === "login";
  const isRegister = activeTab === "register";
  const isDemo = activeTab === "demo";

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const notify: Notify = (kind, message) => setToast({ id: Date.now(), kind, message });
  const dismissToast = useCallback(() => setToast(null), []);

  const onRegisterSuccess = (email: string) => {
    notify("success", "Account created");
    setDefaultEmail(email);
    setTimeout(() => setActiveTab("login"), 100);
  };

  return (
    <Modal {...props} as="form" onSubmit={(e) => e.preventDefault()} sx={{ width: 244, ...sx }}>
      <Tooltip id="login" />
      <Toast toast={toast} onDismiss={dismissToast} />
      <VersionTag />
      <Flex sx={{ flexDirection: "column" }}>
        <Flex role="tablist">
          <Modal.Tab sx={LOGIN_TAB_SX} active={isLogin} onClick={() => setActiveTab("login")}>
            <TabIcon active={isLogin} />
            Login
          </Modal.Tab>
          <Modal.Tab sx={LOGIN_TAB_SX} active={isRegister} onClick={() => setActiveTab("register")}>
            <TabIcon active={isRegister} />
            Register
          </Modal.Tab>
          {canDemo && (
            <Modal.Tab sx={LOGIN_TAB_SX} active={isDemo} onClick={() => setActiveTab("demo")}>
              <TabIcon active={isDemo} />
              Demo
            </Modal.Tab>
          )}
        </Flex>
        <Grid sx={{ gap: 0 }}>
          <TabPanel open={isLogin} flush={isLogin}>
            {/* Keyed by email, so a new account's email and remembered login fill the form */}
            <LoginForm
              key={defaultEmail}
              defaultEmail={defaultEmail}
              isActive={isLogin}
              notify={notify}
              onTicket={onTicket}
            />
          </TabPanel>
          <TabPanel open={isRegister} flush={isLogin}>
            <RegisterForm
              onRegisterSuccess={onRegisterSuccess}
              isActive={isRegister}
              notify={notify}
            />
          </TabPanel>
          {canDemo && (
            <TabPanel open={isDemo} flush={isLogin}>
              {renderDemo(isDemo)}
            </TabPanel>
          )}
        </Grid>
      </Flex>
    </Modal>
  );
};
