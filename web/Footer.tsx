import { Box } from "@aether/ui";
import { STATIC_ROW_STYLES, RowTitle } from ".";

const Footer = () => {
  const currentYear = new Date().getFullYear();

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
        gap: 2,
      }}
    >
      <Box>
        &copy; {currentYear}{" "}
        <a target="_blank" href="https://github.com/VesperLabs">
          Vesper Labs
        </a>
        .
      </Box>
      <Box sx={{ opacity: 0.25 }}>|</Box>
      <Box>
        Made with <span style={{ color: "red" }}>&#10084;</span> in Madrid, Spain.
      </Box>
    </RowTitle>
  );
};

export default Footer;
