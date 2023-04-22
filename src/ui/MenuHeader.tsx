import { Flex, KeyboardButton, Text, Icon, Box } from "./";
import { isMobile } from "../utils";

interface MenuHeaderProps {
  children: string;
  onClick?: () => void;
  icon?: string;
}

const MenuHeader = ({ icon, children, onClick = () => {} }: MenuHeaderProps) => {
  return (
    <Flex sx={{ width: "100%", justifyContent: "end" }}>
      <KeyboardButton
        variant={"header"}
        showOnly={true}
        keyboardKey="ESCAPE"
        sx={{ cursor: "default" }}
        onKeyClick={onClick}
      >
        {icon && <Icon size={22} icon={`../assets/icons/${icon}.png`} />}
        <Text sx={{ flex: 1 }}>{children}</Text>
        {isMobile && (
          <Box onTouchEnd={() => onClick()} sx={{ pointerEvents: "all" }}>
            ❌
          </Box>
        )}
      </KeyboardButton>
    </Flex>
  );
};

export default MenuHeader;
