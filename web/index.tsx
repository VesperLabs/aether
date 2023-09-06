import { Text, Divider, Flex } from "@aether/ui";
import { ThemeUIStyleObject } from "theme-ui";
import { useLocation, Link } from "wouter";

export const Label = (props) => <Text sx={{ fontWeight: "normal" }} {...props} />;

export const TextDivider = ({ children, sx }: any) => (
  <>
    <Divider sx={{ pt: 2, zIndex: -1 }} />
    <Text sx={{ mt: "-17px", pb: 2, mb: -1, color: "gray.500", ...sx }}>{children}</Text>
  </>
);

export const RouterLink = ({ href, children }) => {
  const [page] = useLocation();
  const isActive = href === page;
  return (
    //@ts-ignore
    <Flex as={Link} href={href} sx={{ color: isActive ? "set" : "magic" }}>
      {children}
    </Flex>
  );
};

export const TOOLTIP_STYLE: ThemeUIStyleObject = {
  fontWeight: "bold",
  whiteSpace: "nowrap",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  textTransform: "capitalize",
};

export const STATIC_ROW_STYLES = {
  gap: 3,
  position: "absolute",
  borderRadius: 0,
  fontSize: [0, 1, 1],
  fontWeight: "normal",
  border: `1px solid rgba(255,255,200,.25)`,
  whiteSpace: "nowrap",
  left: 0,
};

export { default as RowTitle } from "./RowTitle";
export { default as Footer } from "./Footer";
export { default as Metrics } from "./Metrics";
