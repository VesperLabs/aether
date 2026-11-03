import { Box } from "@/ui";
import { STATIC_ROW_STYLES } from "./layout";
import { RowTitle } from "./row-title";

/** Who made the wiki, and its version. */
const Credit = () => (
  <Box>
    Made with ❤️ in Barcelona, Spain by{" "}
    <a target="_blank" rel="noopener noreferrer" href="https://trevordesign.com">
      TrevorDesign
    </a>
    <Box as="span" sx={{ opacity: 0.5, ml: 2 }}>
      {__APP_VERSION__}
    </Box>
  </Box>
);

/** The footer bar. Phones have the tab bar instead. */
export const Footer = () => {
  return (
    <RowTitle
      sx={{
        ...STATIC_ROW_STYLES,
        display: ["none", "flex"],
        position: "relative",
        mt: "auto",
        borderWidth: "1px 0 0 0",
        justifyContent: "center",
        textTransform: "none",
      }}
    >
      <Credit />
    </RowTitle>
  );
};
