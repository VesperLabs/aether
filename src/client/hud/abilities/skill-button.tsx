import { Icon, KeyboardKey, Button } from "@/ui";
import { isMobile } from "@/ui";
import type { PressHandler } from "@/ui";
import type { ReactNode } from "react";
import type { ThemeUIStyleObject } from "theme-ui";
import { CostBadge, hasCosts, type ResourceCosts } from "./cost-badge";

export const SkillButton = ({
  onTouchStart = () => {},
  onTouchEnd = () => {},
  icon,
  iconName,
  size,
  keyboardKey,
  sx,
  costs,
  children,
}: {
  onTouchStart?: PressHandler;
  onTouchEnd?: PressHandler;
  icon?: string;
  iconName?: string;
  size: number;
  keyboardKey?: string;
  sx?: ThemeUIStyleObject;
  /** What pressing it spends, shown on pills fused to its rim. */
  costs?: ResourceCosts;
  children?: ReactNode;
}) => {
  const withCosts = hasCosts(costs);
  return (
    <Button
      variant="skill"
      onTouchStart={(e) => onTouchStart(e)}
      onTouchEnd={(e) => onTouchEnd(e)}
      sx={{
        p: size,
        position: "relative",
        flexShrink: 0,
        /* Dimming (cooldowns, chat with no one near) fades instead of snapping */
        transition: "opacity .3s ease",
        /* With costs, the glass is drawn by CostBadge as one shape with its pills */
        ...(withCosts && {
          backgroundColor: "transparent",
          backdropFilter: "none",
          isolation: "isolate",
        }),
        ...sx,
      }}
    >
      {withCosts && costs && <CostBadge costs={costs} />}
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
