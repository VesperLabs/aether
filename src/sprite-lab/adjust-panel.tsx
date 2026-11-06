import { useState } from "react";
import { Button, Flex, Slider, Text } from "@/ui";
import { NO_ADJUSTMENT, type ColorAdjustment } from "./color-adjust";
import { FloatingPanel } from "./floating-panel";

const SLIDERS: { key: keyof ColorAdjustment; label: string; reach: number }[] = [
  { key: "brightness", label: "Brightness", reach: 150 },
  { key: "contrast", label: "Contrast", reach: 100 },
  { key: "saturation", label: "Saturation", reach: 100 },
];

/** Beside the tool panel, which starts at the top left of the preview. */
const START_POSITION = { x: 440, y: 16 };
const PANEL_WIDTH = 280;

/** Photoshop-style adjustments: the sliders preview live until they're applied or cancelled. */
export const AdjustPanel = ({
  hasSelection,
  onPreview,
  onApply,
  onCancel,
}: {
  hasSelection: boolean;
  onPreview: (adjustment: ColorAdjustment) => void;
  onApply: () => void;
  onCancel: () => void;
}) => {
  const [adjustment, setAdjustment] = useState(NO_ADJUSTMENT);
  const changed = SLIDERS.some(({ key }) => adjustment[key] !== 0);

  const handleChange = (key: keyof ColorAdjustment, value: number) => {
    const next = { ...adjustment, [key]: value };
    setAdjustment(next);
    onPreview(next);
  };

  const handleApply = () => {
    setAdjustment(NO_ADJUSTMENT);
    onApply();
  };

  return (
    <FloatingPanel
      id="adjust"
      title={<Text sx={{ fontWeight: "bold" }}>Adjust</Text>}
      width={PANEL_WIDTH}
      start={START_POSITION}
      onClose={onCancel}
    >
      <Text sx={{ fontSize: 0, opacity: 0.5 }}>{hasSelection ? "Selection" : "Whole shape"}</Text>
      {SLIDERS.map(({ key, label, reach }) => (
        <Flex key={key} sx={{ alignItems: "center", gap: 2 }}>
          <Text sx={{ width: 76, fontSize: 1 }}>{label}</Text>
          <Slider
            label={label}
            value={(adjustment[key] + reach) / (reach * 2)}
            onChange={(value) => handleChange(key, Math.round(value * reach * 2 - reach))}
          />
          <Text sx={{ width: 32, fontSize: 1, textAlign: "right" }}>{adjustment[key]}</Text>
        </Flex>
      ))}
      <Flex sx={{ gap: 2 }}>
        <Button variant="wood" onClick={onCancel} sx={{ flex: 1, justifyContent: "center" }}>
          Cancel
        </Button>
        <Button
          variant="wood"
          disabled={!changed}
          onClick={handleApply}
          sx={{ flex: 1, justifyContent: "center" }}
        >
          Apply
        </Button>
      </Flex>
    </FloatingPanel>
  );
};
