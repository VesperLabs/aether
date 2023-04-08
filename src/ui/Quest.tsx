import { Box, SLOT_SIZE, STYLE_SLOT_EMPTY } from "./";

const Quest = ({ quest, size = SLOT_SIZE }: { quest: Quest; size?: number }) => {
  return (
    <Box sx={{ width: size, height: size, ...STYLE_SLOT_EMPTY("./assets/icons/chest.png") }}></Box>
  );
};

export default Quest;
