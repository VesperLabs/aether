import tColors from "./colors-tailwind.json";

export default {
  colors: {
    ...tColors,
    text: tColors.white,
    unique: tColors.amber[100],
    rare: tColors.purple[300],
    set: tColors.lime[300],
    legendary: tColors.purple[300],
    magic: tColors.blue[200],
    common: tColors.white,
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
      p: 1,
      px: 2,
      lineHeight: 1,
      bg: "shadow.30",
      border: `1px solid #000`,
      borderColor: `shadow.30`,
      outline: "none",
      textShadow: "none",
      "&::placeholder": {
        color: "text",
        opacity: 0.15,
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
      "&.active, &:has(.pressed)": {
        boxShadow: `inset 0px 0px 0px 2px ${tColors.blue[200]}`,
      },
    },
    header: {
      variant: "buttons.default",
    },
    menu: {
      variant: "buttons.default",
      borderRadius: 6,
      padding: 1,
      "&[disabled]": {
        opacity: 1,
      },
      "&.active::before, &:has(.pressed)::before": {
        content: '" "',
        display: "block",
        position: "absolute",
        width: "100%",
        height: 4,
        ml: -1,
        mt: -1,
        borderRadius: "6px 6px 0 0",
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
