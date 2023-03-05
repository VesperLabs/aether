import tColors from "./colors-tailwind.json";

export default {
  colors: {
    ...tColors,
    text: tColors.white,
    background: tColors.black,
    primary: tColors.blue[500],
    secondary: tColors.sky[900],
    accent: tColors.teal[500],
    muted: tColors.neutral[200],
    highlight: tColors.sky[500],
    danger: tColors.red[600],
    warning: tColors.orange[500],
    success: tColors.lime[600],
    shadow: {
      15: "rgba(0,0,0,.15)",
      25: "rgba(0,0,0,.25)",
    },
  },
  fonts: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    heading: "inherit",
    monospace: "Menlo, monospace",
  },
  fontSizes: [12, 14, 16, 20, 24, 32, 48, 64, 96],
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
  badges: {
    primary: {
      display: "block",
    },
  },
  styles: {
    root: {
      fontFamily: "body",
      lineHeight: "body",
      fontWeight: "body",
      color: "text",
    },
  },
};
