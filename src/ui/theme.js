import tColors from "./colors-tailwind.json";

export default {
  colors: {
    ...tColors,
    text: tColors.white,
    unique: tColors.amber[100],
    rare: tColors.fuchsia[300],
    set: tColors.lime[300],
    magic: tColors.blue[200],
    common: tColors.white,
    background: tColors.black,
    shadow: {
      10: "rgba(0,0,0,.10)",
      15: "rgba(0,0,0,.15)",
      20: "rgba(0,0,0,.20)",
      25: "rgba(0,0,0,.25)",
      30: "rgba(0,0,0,.30)",
      50: "rgba(0,0,0,.50)",
    },
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
  buttons: {
    menu: {
      padding: 1,
      filter: "grayscale(100%)",
      "*": { opacity: 0.5, transition: ".2s ease all" },
      "&:hover, &.active": { "*": { opacity: 1 } },
      backgroundColor: "shadow.10",
    },
    wood: {
      py: 1,
      px: 2,
      backgroundColor: "yellow.900",
      border: `1px solid #000`,
      boxShadow: `inset 0px 0px 0px 1px rgba(255,255,255,.25)`,
      bg: "yellow.900",
    },
  },
  styles: {
    hr: {
      my: 2,
      color: tColors.white,
      opacity: 0.15,
      width: "100%",
    },
    root: {
      fontSize: 1,
      fontFamily: "body",
      lineHeight: "body",
      fontWeight: "body",
      color: "text",
      "*": {
        textShadow:
          "-1px -1px 0 rgba(0, 0, 0, 0.5), 1px -1px 0 rgba(0, 0, 0, 0.5), -1px 1px 0 rgba(0, 0, 0, 0.5), 1px 1px 0 rgba(0, 0, 0, 0.5)",
        "-webkit-touch-callout": "none",
        "-webkit-user-callout": "none",
        "-webkit-user-select": "none",
        "-webkit-user-drag": "none",
        "-webkit-user-modify": "none",
        "-webkit-highlight": "none",
        "touch-action": "manipulation",
      },
    },
  },
};
