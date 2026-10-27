import { Icon, KeyboardKey, Button } from "@/ui";
import { isMobile } from "@/ui";
import type { PressHandler } from "@/ui";
import type { ReactNode } from "react";
import type { ThemeUIStyleObject } from "theme-ui";

export const SkillButton = ({
  onTouchStart = () => {},
  onTouchEnd = () => {},
  icon,
  iconName,
  size,
  keyboardKey,
  sx,
  children,
}: {
  onTouchStart?: PressHandler;
  onTouchEnd?: PressHandler;
  icon?: string;
  iconName?: string;
  size: number;
  keyboardKey?: string;
  sx?: ThemeUIStyleObject;
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
          onKeyUp={() => onTouchEnd(undefined)}
        />
      )}
      {children}
    </Button>
  );
};
