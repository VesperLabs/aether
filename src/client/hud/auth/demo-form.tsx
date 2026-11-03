import { useState } from "react";
import { Modal } from "@/ui/kit/modal";
import { KeyboardButton } from "@/ui/kit/keyboard-button";
import { Text } from "theme-ui";
import { useAppContext } from "@/client/hud/app/context";
import type { CharClass } from "@/content/stats/stats";
import { CharClassSelect } from "./char-class-select";

export const DemoForm = () => {
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
