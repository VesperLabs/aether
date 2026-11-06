import { useState } from "react";
import { Box, Button, Flex, Text } from "@/ui";
import { CHECKER_SX } from "./checker";
import { FloatingPanel } from "./floating-panel";
import { nudgeSheetFrame } from "./generations-api";
import { IconButton } from "./icon-button";
import type { Frame } from "./lab-state";
import { getLayerSheets, type HumanLayer, type Sheet } from "./sheets";

const START_POSITION = { x: 440, y: 16 };
const PANEL_WIDTH = 220;
const PREVIEW_SIZE = 120;

const ARROWS = [
  { label: "Nudge up", icon: "↑", dx: 0, dy: -1 },
  { label: "Nudge left", icon: "←", dx: -1, dy: 0 },
  { label: "Nudge right", icon: "→", dx: 1, dy: 0 },
  { label: "Nudge down", icon: "↓", dx: 0, dy: 1 },
];

/** Moves one frame on every sheet of a slot. Nothing is written until it's applied. */
export const NudgePanel = ({
  target,
  layer,
  frame,
  cell,
  originalUrl,
  onClose,
}: {
  target: Sheet;
  /** The slot it's worn in. With none, as for a body, only this sheet moves. */
  layer?: HumanLayer;
  frame: Frame;
  cell: number;
  originalUrl: string;
  onClose: () => void;
}) => {
  const sheets = layer ? getLayerSheets(layer) : [target];
  const [offset, setOffset] = useState({ dx: 0, dy: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const { dx, dy } = offset;

  const handleApply = async () => {
    setBusy(true);
    setError(undefined);
    let done = 0;
    try {
      for (const sheet of sheets) {
        await nudgeSheetFrame(sheet, frame, dx, dy);
        done += 1;
      }
      /* The URL keeps the lab's state; a reload picks up the changed sheets. */
      window.location.reload();
    } catch (failure) {
      const reason = failure instanceof Error ? failure.message : "Nudge failed";
      setError(`Stopped after ${done} of ${sheets.length} sheets: ${reason}`);
      setBusy(false);
    }
  };

  return (
    <FloatingPanel
      id="nudge"
      title={<Text sx={{ fontWeight: "bold" }}>Nudge frame</Text>}
      width={PANEL_WIDTH}
      start={START_POSITION}
      onClose={onClose}
    >
      <Text sx={{ fontSize: 0, opacity: 0.5 }}>
        {layer ?? target.texture}: {sheets.length} {sheets.length === 1 ? "sheet" : "sheets"}
      </Text>
      <Box
        sx={{
          alignSelf: "center",
          width: PREVIEW_SIZE,
          height: PREVIEW_SIZE,
          overflow: "hidden",
          ...CHECKER_SX,
        }}
      >
        <Box
          as="img"
          {...{ src: originalUrl, alt: "Nudged frame", draggable: false }}
          style={{ transform: `translate(${(dx / cell) * 100}%, ${(dy / cell) * 100}%)` }}
          sx={{ display: "block", width: "100%", imageRendering: "pixelated" }}
        />
      </Box>
      <Flex sx={{ gap: 1, justifyContent: "center" }}>
        {ARROWS.map(({ label, icon, dx: stepX, dy: stepY }) => (
          <IconButton
            key={label}
            label={label}
            icon={icon}
            disabled={busy}
            onClick={() => setOffset({ dx: dx + stepX, dy: dy + stepY })}
          />
        ))}
      </Flex>
      <Text sx={{ fontSize: 0, textAlign: "center" }}>
        x {dx}, y {dy}
      </Text>
      {error && <Text sx={{ fontSize: 0, color: "#ff4d4d" }}>{error}</Text>}
      <Button variant="menu" disabled={busy || (!dx && !dy)} onClick={handleApply}>
        {busy ? "Nudging..." : `Apply to ${sheets.length}`}
      </Button>
    </FloatingPanel>
  );
};
