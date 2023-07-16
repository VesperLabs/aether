import { Box } from "@aether/ui";

const SlotAmount = (props) => (
  <Box
    sx={{
      position: "absolute",
      mt: `1px`,
      ml: `2px`,
      fontSize: 0,
      zIndex: 2,
    }}
    {...props}
  />
);

export default SlotAmount;
