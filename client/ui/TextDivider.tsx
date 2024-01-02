import { Box, Divider, Text, theme } from "@aether/ui";
import { get } from "lodash";

// Utility function to convert hex color to RGBA
const hexToRGBA = (hex, alpha = 1) => {
  let r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);

  if (alpha > 1) alpha = 1;
  if (alpha < 0) alpha = 0;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const TextDivider = ({ children, sx, color = "gray.500", alpha = 0.5 }: any) => {
  const resolvedColor = get(theme, `colors.${color}`) ?? color;
  const colorWithAlpha = hexToRGBA(resolvedColor, alpha);

  return (
    <Text
      sx={{
        py: 2,
        color,
        position: "relative",
        display: "block",
        width: "100%",
        textAlign: "center",
        backgroundImage: `linear-gradient(to bottom, transparent 50%, ${colorWithAlpha} 50%, ${colorWithAlpha} 52%, transparent 52%)`,
        backgroundPosition: "center",
        ...sx,
      }}
    >
      {children}
    </Text>
  );
};

export default TextDivider;
