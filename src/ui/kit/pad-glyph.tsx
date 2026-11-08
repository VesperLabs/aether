import { createContext, useContext } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { Box, Flex } from "theme-ui";

/** A controller button, or a combo with `hold` kept down. Indices follow the standard gamepad mapping. */
export interface PadButton {
  button: number;
  hold?: number;
}

/**
 * Set while a controller is in use: the controller button a key's action is bound to, so key
 * badges draw that instead. Undefined for a key whose action has no button.
 */
const PadHintContext = createContext<
  ((key: string, inModal: boolean) => PadButton | undefined) | undefined
>(undefined);

export const PadHintProvider = PadHintContext.Provider;

/**
 * On a key badge drawing a controller button. A highlighted control with one shows A in that
 * same badge, so the menu's own A badge leaves it be: one badge per corner.
 */
export const PAD_KEY_ATTR = "data-pad-key";
/** The highlight's mark on what it's on (`pad-nav`). */
const PAD_FOCUS = "[data-pad-focus]";

/** Shows a key badge's own button, or A while the control it's on is highlighted. */
export const PAD_KEY_SWAP = {
  "& > .pad-a": { display: "none" },
  [`${PAD_FOCUS} & > .pad-a`]: { display: "flex" },
  [`${PAD_FOCUS} & > .pad-own`]: { display: "none" },
};

export const usePadHint = () => useContext(PadHintContext);

const INK = "#000";
const BODY = "#3a3a3a";
const LIGHT = "#EEE";

/** Which family of controller, as each names its buttons differently. */
export type PadStyle = "xbox" | "switch" | "playstation";

const PadStyleContext = createContext<PadStyle>("xbox");

export const PadStyleProvider = PadStyleContext.Provider;

interface Labels {
  /* A, B, X, Y: buttons are numbered by their letter, so these name the same button on each */
  face: { letter: string; color: string }[];
  shoulders: [string, string, string, string];
  other: Record<number, string>;
}

/* Face buttons keep the colors players know them by; Nintendo's are plain. */
const LABELS: Record<PadStyle, Labels> = {
  xbox: {
    face: [
      { letter: "A", color: "#7ed957" },
      { letter: "B", color: "#ff6b5b" },
      { letter: "X", color: "#5bb4ff" },
      { letter: "Y", color: "#ffd84a" },
    ],
    shoulders: ["LB", "RB", "LT", "RT"],
    other: { 8: "BACK", 9: "START", 16: "HOME" },
  },
  switch: {
    face: [
      { letter: "A", color: LIGHT },
      { letter: "B", color: LIGHT },
      { letter: "X", color: LIGHT },
      { letter: "Y", color: LIGHT },
    ],
    shoulders: ["L", "R", "ZL", "ZR"],
    other: { 8: "−", 9: "+", 16: "HOME" },
  },
  playstation: {
    face: [
      { letter: "✕", color: "#8fb4ff" },
      { letter: "○", color: "#ff6b6b" },
      { letter: "□", color: "#f59ad6" },
      { letter: "△", color: "#5fd6b5" },
    ],
    shoulders: ["L1", "R1", "L2", "R2"],
    other: { 8: "SHARE", 9: "OPT", 16: "PS" },
  },
};

const LABEL_SX: ThemeUIStyleObject = {
  fontSize: "8px",
  fontWeight: "bold",
  lineHeight: 1,
  color: LIGHT,
  textShadow: "none",
};

/* A 1px dark rim, with a lighter line inside the top, like the keyboard badges. */
const BEVEL = `0 0 0 1px ${INK}, inset 0 1px 0 rgba(255, 255, 255, 0.25)`;

const Face = ({ index }: { index: number }) => {
  const { letter, color } = LABELS[useContext(PadStyleContext)].face[index];
  return (
    <Flex
      className="pad-shape"
      sx={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        bg: BODY,
        boxShadow: BEVEL,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box sx={{ ...LABEL_SX, fontSize: "9px", color }}>{letter}</Box>
    </Flex>
  );
};

/** Bumpers are flat bars; triggers are taller with a rounded top. */
const Shoulder = ({ label, trigger }: { label: string; trigger: boolean }) => (
  <Flex
    className="pad-shape"
    sx={{
      height: trigger ? 15 : 11,
      px: "3px",
      minWidth: 18,
      bg: BODY,
      boxShadow: BEVEL,
      borderRadius: trigger ? "7px 7px 3px 3px" : "5px 5px 2px 2px",
      alignItems: trigger ? "flex-end" : "center",
      justifyContent: "center",
      pb: trigger ? "2px" : 0,
    }}
  >
    <Box sx={LABEL_SX}>{label}</Box>
  </Flex>
);

const Pill = ({ label }: { label: string }) => (
  <Flex
    className="pad-shape"
    sx={{
      height: 10,
      px: "3px",
      bg: BODY,
      boxShadow: BEVEL,
      borderRadius: 5,
      alignItems: "center",
    }}
  >
    <Box sx={{ ...LABEL_SX, fontSize: "7px" }}>{label}</Box>
  </Flex>
);

const Stick = ({ label }: { label: string }) => (
  <Flex
    className="pad-shape"
    sx={{
      width: 15,
      height: 15,
      borderRadius: "50%",
      bg: BODY,
      boxShadow: `${BEVEL}, inset 0 0 0 3px #2a2a2a`,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Box sx={{ ...LABEL_SX, fontSize: "7px" }}>{label}</Box>
  </Flex>
);

const PLUS = "5,0 10,0 10,5 15,5 15,10 10,10 10,15 5,15 5,10 0,10 0,5 5,5";
/* Where each direction's gradient runs: from the centre out to the tip of its arm */
const TOWARD: Record<number, { x2: number; y2: number }> = {
  12: { x2: 0, y2: 0 },
  13: { x2: 0, y2: 1 },
  14: { x2: 0, y2: 0 },
  15: { x2: 1, y2: 0 },
};

/** A plus that brightens toward the bound direction. 12 up, 13 down, 14 left, 15 right. */
const DPad = ({ index }: { index: number }) => {
  const id = `pad-dpad-${index}`;
  const horizontal = index >= 14;
  const { x2, y2 } = TOWARD[index];
  /* From the far side to the bound tip */
  const from = horizontal ? { x1: 1 - x2, y1: 0 } : { x1: 0, y1: 1 - y2 };
  return (
    /* Drawn as one shape so it stays crisp at any HUD zoom */
    <svg
      width={15}
      height={15}
      viewBox="-0.5 -0.5 16 16"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={id} {...from} x2={horizontal ? x2 : 0} y2={horizontal ? 0 : y2}>
          <stop offset="0.5" stopColor={BODY} />
          <stop offset="1" stopColor={LIGHT} />
        </linearGradient>
      </defs>
      <polygon points={PLUS} fill={`url(#${id})`} stroke={INK} strokeLinejoin="miter" />
    </svg>
  );
};

/** The box every glyph is centred in, so badges of any shape share one centre on a corner. */
const CELL = 14;

/**
 * One glyph. On the corner (`centred`) it sits in a fixed cell, its centre where every badge's
 * is; a combo's held button keeps its own width, so the two never overlap.
 */
const PadGlyph = ({ index, centred = true }: { index: number; centred?: boolean }) => (
  <Flex
    sx={{
      ...(centred ? { width: CELL } : { minWidth: CELL }),
      height: CELL,
      alignItems: "center",
      justifyContent: "center",
      /* Wider and taller glyphs spill out evenly round the shared centre */
      overflow: "visible",
      flexShrink: 0,
    }}
  >
    <GlyphShape index={index} />
  </Flex>
);

const GlyphShape = ({ index }: { index: number }) => {
  const labels = LABELS[useContext(PadStyleContext)];
  if (index <= 3) return <Face index={index} />;
  if (index >= 4 && index <= 7) {
    return <Shoulder label={labels.shoulders[index - 4]} trigger={index >= 6} />;
  }
  if (index === 10 || index === 11) return <Stick label={index === 10 ? "L" : "R"} />;
  if (index >= 12 && index <= 15) return <DPad index={index} />;
  return <Pill label={labels.other[index] ?? `B${index}`} />;
};

/** A button, or a combo drawn as the held button, a plus, then the pressed one. */
export const PadCombo = ({
  pad,
  sx,
  className,
}: {
  pad: PadButton;
  sx?: ThemeUIStyleObject;
  className?: string;
}) => (
  <Flex
    className={className}
    sx={{
      alignItems: "center",
      /* Room for a wide pressed button (RT) spilling out of its centred cell */
      gap: pad.hold === undefined ? "2px" : "4px",
      ...sx,
    }}
  >
    {pad.hold !== undefined && (
      <>
        <PadGlyph index={pad.hold} centred={false} />
        <Box sx={{ ...LABEL_SX, color: LIGHT, textShadow: `0 1px 0 ${INK}` }}>+</Box>
      </>
    )}
    <PadGlyph index={pad.button} />
  </Flex>
);
