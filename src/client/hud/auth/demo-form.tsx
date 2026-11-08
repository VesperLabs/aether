import { useState } from "react";
import { CharClassSelect, GenderRow, Modal, KeyboardButton, Text, type Gender } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import type { CharClass } from "@/content";

export const DemoForm = ({ isActive }: { isActive: boolean }) => {
  const { socket } = useAppContext();
  const [charClass, setCharClass] = useState<CharClass>("warrior");
  const [gender, setGender] = useState<Gender>("female");

  const handleDemoLogin = () => {
    socket.emit("demoLogin", { charClass, gender });
  };

  return (
    <Modal.Body sx={{ gap: 2 }}>
      <CharClassSelect charClass={charClass} setCharClass={setCharClass} />
      <Text sx={{ fontSize: 0, opacity: 0.6, whiteSpace: "normal", textAlign: "center" }}>
        Note: your progress will not be saved. For that you will need to click "Register".
      </Text>
      <GenderRow gender={gender} setGender={setGender} />
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
