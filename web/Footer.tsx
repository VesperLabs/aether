import { Box } from "@aether/ui";
import { STATIC_ROW_STYLES, RowTitle } from ".";

const Footer = () => {
  return (
    <RowTitle
      sx={{
        ...STATIC_ROW_STYLES,
        position: "absolute",
        display: "flex",
        bottom: 0,
        borderWidth: "1px 0 0 0",
        justifyContent: "center",
        textTransform: "none",
      }}
    >
      <Box>
        Made with ❤️ in Barcelona, Spain by{" "}
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://trevordesign.com"
        >
          TrevorDesign
        </a>
      </Box>
    </RowTitle>
  );
};

export default Footer;
