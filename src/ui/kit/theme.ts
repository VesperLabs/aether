import tColors from "./colors-tailwind.json";

/**
 * The one text size for every control: inputs, dropdowns, buttons and button groups. With the
 * same padding and 1px edge on each, they all stand the same height side by side.
 */
export const CONTROL_TEXT = { fontSize: 1, lineHeight: 1.25 } as const;

export const theme = {
  colors: {
    ...tColors,
    text: tColors.white,
    /* Tailwind orange-300 nudged toward amber, level with rare, set and magic. */
    unique: "#fdc674",
    rare: tColors.purple[300],
    set: tColors.lime[300],
    legendary: tColors.purple[300],
    magic: tColors.blue[300],
    common: tColors.white,
    /* Done, ready or healthy: checkmarks, toasts, active set bonuses. Never borrow `set` for this. */
    success: tColors.lime[300],
    background: tColors.black,
    danger: tColors.red[300],
    warning: tColors.orange[300],
    shadow: {
      10: "rgba(0,0,0,.10)",
      15: "rgba(0,0,0,.15)",
      20: "rgba(0,0,0,.20)",
      25: "rgba(0,0,0,.25)",
      30: "rgba(0,0,0,.30)",
      50: "rgba(0,0,0,.50)",
    },
  },
  zIndices: {
    /* The controller's button badge, over everything it can sit on (the on-screen keyboard) */
    padBadge: 99999999,
    tooltip: 9999999,
    draggable: 999999,
    modal: 99999,
    menus: 9999,
    minimap: 999,
  },
  fonts: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    heading: "inherit",
    monospace: "Menlo, monospace",
  },
  fontSizes: [10, 12, 14, 16, 20, 24, 32, 48, 64, 96],
  fontWeights: {
    body: 400,
    heading: 700,
    bold: 700,
  },
  lineHeights: {
    body: 1.25,
    heading: 1.25,
  },
  letterSpacings: {
    body: "normal",
    caps: "0.2em",
  },
  breakpoints: ["40em", "52em", "64em"],
  space: [0, 4, 8, 16, 32, 64, 128, 256, 512],
  radii: [0, 3, 6],
  badges: {
    primary: {
      display: "block",
    },
  },
  forms: {
    input: {
      ...CONTROL_TEXT,
      p: 1,
      px: 2,
      bg: "rgba(0, 0, 0, 0.38)",
      /* Recessed into the panel, shaded from above. Its edge is the same crisp black line as a
         wood button's, inside its box, so fields and buttons line up and frame alike. */
      border: `1px solid #000`,
      boxShadow: `inset 0 1px 1px rgba(0, 0, 0, 0.2)`,
      outline: "none",
      textShadow: "none",
      transition: "background-color 0.15s ease",
      "&:focus": {
        bg: "rgba(0, 0, 0, 0.46)",
      },
      "&::placeholder": {
        color: "text",
        opacity: 0.4,
      },
    },
  },
  buttons: {
    default: {
      boxShadow: "0 0",
      fontSmoothing: "never",
      verticalAlign: "middle",
      display: "flex",
      cursor: "pointer",
      touchAction: "none",
      userSelect: "none",
      pointerEvents: "all",
      whiteSpace: "nowrap",
      "&:focus": {
        outline: "none",
      },
      "&[disabled]": {
        cursor: "default",
        opacity: 0.5,
      },
    },
    skill: {
      variant: "buttons.default",
      opacity: 1,
      backgroundColor: "shadow.30",
      borderRadius: "100%",
      backdropFilter: "blur(2px)",
    },
    header: {
      variant: "buttons.default",
    },
    menu: {
      variant: "buttons.default",
      position: "relative",
      borderRadius: 6,
      padding: 1,
      "&[disabled]": {
        opacity: 1,
      },
      "&.active::before, &:has(.pressed)::before": {
        content: '" "',
        display: "block",
        /* Pinned 1px inside the button's edges, so it fits whatever the padding or alignment
           inside, with a gap between it and the button's border */
        position: "absolute",
        top: 1,
        left: 1,
        right: 1,
        height: 4,
        borderRadius: "inherit",
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        boxShadow: `inset 0px 2px 0px 0px ${tColors.blue[200]}`,
      },
      backgroundColor: "shadow.10",
    },
    wood: {
      variant: "buttons.default",
      borderRadius: 4,
      py: 1,
      px: 2,
      backgroundColor: "yellow.900",
      border: `1px solid #000`,
      boxShadow: `inset 0px 0px 0px 1px rgba(255,255,255,.25)`,
      bg: "yellow.900",
      position: "relative",
    },
    /* A clickable wood button. Plain `wood` also dresses panels and inherits their text size; a
       control's text is pinned to the same size as inputs and selects, so every control in a row
       matches. */
    control: {
      variant: "buttons.wood",
      ...CONTROL_TEXT,
      alignItems: "center",
      justifyContent: "center",
      gap: 1,
    },
  },
  styles: {
    hr: {
      my: 2,
      color: tColors.white,
      opacity: 0.1,
      width: "100%",
    },
    root: {
      fontSize: 2,
      fontFamily: "body",
      lineHeight: "body",
      fontWeight: "body",
      color: "text",
      "*": {
        textShadow:
          "-1px -1px 0 rgba(0, 0, 0, 0.5), 1px -1px 0 rgba(0, 0, 0, 0.5), -1px 1px 0 rgba(0, 0, 0, 0.5), 1px 1px 0 rgba(0, 0, 0, 0.5)",
        WebkitTouchCallout: "none",
        WebkitUserCallout: "none",
        WebkitUserSelect: "none",
        WebkitUserDrag: "none",
        WebkitUserModify: "none",
        WebkitHighlight: "none",
        touchAction: "manipulation",
      },
      a: {
        color: "rare",
        textDecoration: "none",
        fontWeight: "bold",
      },
    },
  },
};
