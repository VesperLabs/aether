import { Flex, KeyboardButton, Text } from "./";
import { isMobile } from "../utils";

interface MenuHeaderProps {
  children: string;
  onClick?: () => void;
}

const MenuHeader = ({ children, onClick = () => {} }: MenuHeaderProps) => {
  return (
    <Flex sx={{ width: "100%", justifyContent: "end" }}>
      <KeyboardButton variant={"header"} showOnly={true} onClick={onClick} keyboardKey="ESCAPE">
        <Text sx={{ flex: 1 }}>{children}</Text>
        {isMobile && <>❌</>}
      </KeyboardButton>
    </Flex>
  );
};

export default MenuHeader;
