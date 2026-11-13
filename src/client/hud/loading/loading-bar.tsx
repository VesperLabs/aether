import { useEffect, useState } from "react";
import { Box } from "@/ui";

const FRAME = "#6b5338";
const FILL = "#e8d9b5";
const BAR_WIDTH = 240;
const BAR_HEIGHT = 8;

/** How far the game's assets have loaded, 0 to 1: sent by the boot scene as it downloads them. */
export function useLoadProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onProgress = (event: Event) => setProgress((event as CustomEvent<number>).detail);
    window.addEventListener("LOAD_PROGRESS", onProgress);
    return () => window.removeEventListener("LOAD_PROGRESS", onProgress);
  }, []);
  return progress;
}

/** A framed progress bar, centred on the screen, for the wait before the login form comes in. */
export function LoadingBar({ progress }: { progress: number }) {
  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        color: FILL,
        fontFamily: "monospace",
        fontSize: "12px",
        pointerEvents: "none",
      }}
    >
      <Box>Loading {Math.floor(progress * 100)}%</Box>
      <Box sx={{ width: BAR_WIDTH + 4, height: BAR_HEIGHT + 4, border: `1px solid ${FRAME}` }}>
        <Box
          sx={{
            width: BAR_WIDTH * progress,
            height: BAR_HEIGHT,
            margin: "1px",
            backgroundColor: FILL,
          }}
        />
      </Box>
    </Box>
  );
}
