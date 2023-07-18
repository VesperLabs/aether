import { Text, Divider } from "@aether/ui";
import { ThemeUIStyleObject } from "theme-ui";

export const Label = (props) => <Text sx={{ fontWeight: "normal" }} {...props} />;

export const TextDivider = ({ children, sx }: any) => (
  <>
    <Divider sx={{ pt: 2, zIndex: -1 }} />
    <Text sx={{ mt: "-14px", pb: 2, mb: -1, color: "gray.500", ...sx }}>{children}</Text>
  </>
);

export const TOOLTIP_STYLE: ThemeUIStyleObject = {
  fontWeight: "bold",
  whiteSpace: "nowrap",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  textTransform: "capitalize",
  fontSize: "8px",
};
