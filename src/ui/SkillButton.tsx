import { Box, Icon, KeyboardKey, Button } from "./";
import { isMobile } from "../utils";

const SkillButton = ({
  onTouchStart = () => {},
  onTouchEnd = () => {},
  icon,
  iconName,
  size,
  keyboardKey,
}: {
  onTouchStart?: any;
  onTouchEnd?: any;
  icon?: string;
  iconName?: string;
  size: number;
  keyboardKey?: string;
}) => {
  return (
    <Box sx={{ position: "relative", flexShrink: 0 }}>
      <Button
        variant="skill"
        onTouchStart={(e) => onTouchStart(e)}
        onTouchEnd={(e) => onTouchEnd(e)}
        sx={{
          p: size,
        }}
      >
        <Icon icon={icon || `../assets/icons/${iconName}.png`} />
        {keyboardKey && (
          <KeyboardKey
            name={keyboardKey}
            hidden={isMobile}
            onKeyDown={(e) => onTouchStart(e)}
            onKeyUp={(e) => onTouchEnd(e)}
          />
        )}
      </Button>
    </Box>
  );
};

export default SkillButton;
