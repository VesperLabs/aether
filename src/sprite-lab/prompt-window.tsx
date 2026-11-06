import { useState, type ReactNode } from "react";
import { Button, Text } from "@/ui";
import { FloatingPanel } from "./floating-panel";
import { WINDOW_WIDTH } from "./window-layout";

/** A button that opens the prompt options in a window of their own. */
export const PromptWindow = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="wood"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        sx={{ flex: 1, justifyContent: "center" }}
      >
        Prompt
      </Button>
      {open && (
        <FloatingPanel
          id="prompt"
          title={<Text sx={{ fontWeight: "bold" }}>Prompt</Text>}
          width={WINDOW_WIDTH}
          start={{ x: window.innerWidth - (WINDOW_WIDTH + 16) * 2, y: 16 }}
          onClose={() => setOpen(false)}
          overflowing
        >
          {children}
        </FloatingPanel>
      )}
    </>
  );
};
