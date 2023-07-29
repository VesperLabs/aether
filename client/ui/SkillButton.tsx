import { Icon, KeyboardKey, Button } from "@aether/ui";
import { isMobile } from "@aether/shared";
import { ReactNode } from "react";

const SkillButton = ({
  onTouchStart = () => {},
  onTouchEnd = () => {},
  icon,
  iconName,
  size,
  keyboardKey,
  sx,
  children,
}: {
  onTouchStart?: any;
  onTouchEnd?: any;
  icon?: string;
  iconName?: string;
  size: number;
  keyboardKey?: string;
  sx?: any;
  children?: ReactNode;
}) => {
  return (
    <Button
      variant="skill"
      onTouchStart={(e) => onTouchStart(e)}
      onTouchEnd={(e) => onTouchEnd(e)}
      sx={{
        p: size,
        position: "relative",
        flexShrink: 0,
        ...sx,
      }}
    >
      <Icon icon={icon || `./assets/icons/${iconName}.png`} />
      {keyboardKey && (
        <KeyboardKey
          name={keyboardKey}
          hidden={isMobile}
          onKeyDown={(e) => onTouchStart(e)}
          onKeyUp={(e) => onTouchEnd(e)}
        />
      )}
      {children}
    </Button>
  );
};

export default SkillButton;
