import { memo, useEffect, useState } from "react";
import { Divider, Flex, Icon, Text } from "@/ui";
import { arePropsEqualWithKeys } from "@/ui/are-props-equal";
import { formatStats } from "@/shared/rules/stats";
import { buffList } from "@/shared/content";
import type { ThemeUIStyleObject } from "theme-ui";
import type { ActiveBuff } from "@/shared/rules/buffs";
import type { HudCharacter } from "@/client/hud/app/context";
import { Tooltip } from "@/client/hud/tooltips/tooltip";
import { TooltipLabel } from "@/client/hud/tooltips/tooltip-label";
import { TextDivider } from "@/client/hud/menu/text-divider";

interface BuffProps {
  buff: ActiveBuff;
  tooltipId: string;
  player?: Partial<HudCharacter> | null;
}

const BuffTooltip = ({
  buff,
  tooltipId,
  timeLeft,
  player,
}: BuffProps & { timeLeft: number | undefined }) => {
  const stats = buff?.name === "rest" ? { regenHp: player?.stats?.regenHp } : buff?.stats;
  const combinedStats = formatStats(stats);
  const description = (buffList as Record<string, { description?: string }>)?.[buff?.name as string]
    ?.description;
  const displayTime = (timeLeft as number) < 0 ? "∞" : ((timeLeft as number) / 1000)?.toFixed(0);
  return (
    <Tooltip id={tooltipId}>
      <Flex
        sx={{
          textAlign: "center",
          fontWeight: "bold",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          textTransform: "capitalize",
        }}
      >
        <Text>
          {"Lv." + buff?.level + " " + buff?.name?.charAt(0).toUpperCase() + buff?.name?.slice(1)}
        </Text>
        <TextDivider>Time: {displayTime}</TextDivider>
        {Object.keys(combinedStats).map((key) => (
          <Text key={key}>
            <TooltipLabel>{key}:</TooltipLabel> {combinedStats[key]}
          </Text>
        ))}
        {Object.keys(buff?.percentStats || {}).map((key) => (
          <Text key={key}>
            <TooltipLabel>{key}:</TooltipLabel> {buff?.percentStats?.[key]}%
          </Text>
        ))}
        {!!description && <Divider />}
        <TooltipLabel
          sx={{ textTransform: "none", fontWeight: "normal", fontStyle: "italic", maxWidth: 200 }}
        >
          {description}
        </TooltipLabel>
      </Flex>
    </Tooltip>
  );
};

const Buff = ({ buff, tooltipId, player }: BuffProps) => {
  const [timeLeft, setTimeLeft] = useState<number>();

  useEffect(() => {
    const updateTimeLeft = () => {
      const timeDiff = (buff?.spawnTime as number) + (buff?.duration as number) - Date.now();
      setTimeLeft(timeDiff);
    };

    updateTimeLeft(); // Initial update
    const intervalId = setInterval(updateTimeLeft, 1000); // Update every second

    return () => clearInterval(intervalId);
  }, [buff]);

  // Determine if the blinking animation should be applied
  const isBlinking =
    (timeLeft as number) >= 0 && (timeLeft as number) <= (buff?.duration as number) * 0.25;

  // Define the blinking style
  const blinkingStyle = isBlinking
    ? {
        "@keyframes blink": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0 },
        },
        animation: "blink 1s linear infinite",
      }
    : {};

  return (
    <>
      <BuffTooltip
        key={buff?.name}
        buff={buff}
        tooltipId={tooltipId}
        timeLeft={timeLeft}
        player={player}
      />
      <Icon
        icon={`./assets/atlas/spell/spell-${buff.name}.png`}
        size={24}
        data-tooltip-place="bottom"
        data-tooltip-id={tooltipId}
        sx={blinkingStyle} // Apply the blinking style conditionally
      />
    </>
  );
};

export const Buffs = memo(
  ({ player, sx }: { player?: Partial<HudCharacter> | null; sx?: ThemeUIStyleObject }) => {
    const buffs = player?.buffs;
    return (
      <Flex
        sx={{
          mt: 1,
          transformOrigin: "top left",
          imageRendering: "pixelated",
          ...sx,
        }}
      >
        <Flex sx={{ flexDirection: "row-reverse", gap: 1, height: 24 }}>
          {buffs?.map((buff: ActiveBuff) => {
            const tooltipId = `buffs-${buff?.name}-${player?.id}`;
            return <Buff key={tooltipId} tooltipId={tooltipId} buff={buff} player={player} />;
          })}
        </Flex>
      </Flex>
    );
  },
  arePropsEqualWithKeys(["player.buffs"]),
);
