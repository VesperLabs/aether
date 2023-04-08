import { Flex, KeyboardButton, Text, Icon } from "./";
import { isMobile } from "../utils";

interface MenuHeaderProps {
  children: string;
  onClick?: () => void;
  icon?: string;
}

const MenuHeader = ({ icon, children, onClick = () => {} }: MenuHeaderProps) => {
  return (
    <Flex sx={{ width: "100%", justifyContent: "end" }}>
      <KeyboardButton variant={"header"} showOnly={true} onClick={onClick} keyboardKey="ESCAPE">
        {icon && <Icon size={22} icon={`../assets/icons/${icon}.png`} />}
        <Text sx={{ flex: 1 }}>{children}</Text>
        {isMobile && <>❌</>}
      </KeyboardButton>
    </Flex>
  );
};

export default MenuHeader;
