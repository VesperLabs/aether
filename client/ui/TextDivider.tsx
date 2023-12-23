import { Box, Text, Divider } from "@aether/ui";

const TextDivider = ({ children, sx, color = "gray.500" }: any) => (
  <Box py={2} sx={{ width: "100%", textAlign: "center", ...sx }}>
    <Divider sx={{ my: 0, mb: -2, mt: 2, zIndex: -1 }} />
    <Text sx={{ pb: 2, mb: -1, color, position: "relative" }}>{children}</Text>
  </Box>
);

export default TextDivider;
