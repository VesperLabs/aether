import { Box, KeyboardButton } from "./";
import { isMobile } from "../utils";

interface MenuHeaderProps {
  children: string;
  onClick?: () => void;
}

const MenuHeader = ({ children, onClick = () => {} }: MenuHeaderProps) => {
  return (
    <Box>
      <KeyboardButton showOnly={true} onClick={onClick} keyboardKey="ESCAPE">
        {children} {isMobile && "❌"}
      </KeyboardButton>
    </Box>
  );
};

export default MenuHeader;
