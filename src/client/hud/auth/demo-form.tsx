import { useState } from "react";
import { Modal, KeyboardButton, Text } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import type { CharClass } from "@/content";
import { CharClassSelect } from "./char-class-select";
import { RememberRow } from "./remember-row";

export const DemoForm = ({ isActive }: { isActive: boolean }) => {
  const { socket } = useAppContext();
  const [charClass, setCharClass] = useState<CharClass>("warrior");

  const handleDemoLogin = () => {
    socket.emit("demoLogin", { charClass });
  };

  return (
    <Modal.Body sx={{ gap: 2 }}>
      <CharClassSelect charClass={charClass} setCharClass={setCharClass} />
      <Text sx={{ fontSize: 0, opacity: 0.6, whiteSpace: "normal", textAlign: "center" }}>
        Note: your progress will not be saved. For that you will need to click "Register".
      </Text>
      <RememberRow reserveOnly />
      <KeyboardButton
        sx={{ flex: 1 }}
        /* Hidden tabs stay mounted, and ENTER presses every enabled button on the page */
        disabled={!isActive}
        onClick={() => handleDemoLogin()}
        keyboardKey="ENTER"
      >
        Play
      </KeyboardButton>
    </Modal.Body>
  );
};
