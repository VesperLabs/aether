import { memo, useEffect, useState } from "react";
import { Flex, Icon, RomanNumeral, Text } from "@/ui";
import { arePropsEqualWithKeys } from "@/ui";
import { formatStats } from "@/rules/stats";
import { buffIcon, buffList } from "@/content";
import type { ThemeUIStyleObject } from "theme-ui";
import type { ActiveBuff } from "@/rules/buffs";
import type { HudCharacter } from "@/client/hud/app/context";
import { Tooltip } from "@/ui";
import { Label } from "@/ui";
import { TextDivider } from "@/ui";

/** A buff's icon on the big plate, in px. */
const DEFAULT_ICON_SIZE = 24;

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
          {`${buff?.name?.charAt(0).toUpperCase()}${buff?.name?.slice(1)} `}
          <RomanNumeral value={buff?.level} />
        </Text>
        <TextDivider>Time: {displayTime}</TextDivider>
        {Object.keys(combinedStats).map((key) => (
          <Text key={key}>
            <Label>{key}:</Label> {combinedStats[key]}
          </Text>
        ))}
        {Object.keys(buff?.percentStats || {}).map((key) => (
          <Text key={key}>
            <Label>{key}:</Label> {buff?.percentStats?.[key]}%
          </Text>
        ))}
        {!!description && <TextDivider />}
        <Label
          sx={{ textTransform: "none", fontWeight: "normal", fontStyle: "italic", maxWidth: 200 }}
        >
          {description}
        </Label>
      </Flex>
    </Tooltip>
  );
};

const Buff = ({ buff, tooltipId, player, size }: BuffProps & { size: number }) => {
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
        icon={`./assets/atlas/spell/${buffIcon(buff.name ?? "")}.png`}
        size={size}
        data-tooltip-place="bottom"
        data-tooltip-id={tooltipId}
        sx={{
          ...blinkingStyle,
          /* The whole 32px art shrunk to fit, not its middle cut out. Shrunk by an uneven fraction
             (24px), crisp pixels would drop rows: smoothed. A whole fraction (16px) stays crisp */
          backgroundSize: "contain",
          imageRendering: 32 % size ? "auto" : "pixelated",
        }}
      />
    </>
  );
};

export const Buffs = memo(
  ({
    player,
    sx,
    iconSize = DEFAULT_ICON_SIZE,
    wrapRows,
  }: {
    player?: Partial<HudCharacter> | null;
    sx?: ThemeUIStyleObject;
    /** Each buff's icon, in px. */
    iconSize?: number;
    /** Wraps onto this many rows, left to right, cutting off the rest; else one row, any length. */
    wrapRows?: number;
  }) => {
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
        <Flex
          sx={{
            /* Each icon overlaps the one before it by the empty edge around the art (5 of its
               32px, about 4 at 24, on each side), so the drawn icons sit about 2px apart: on its
               right when laid out right to left, its left when wrapping left to right */
            ...(wrapRows
              ? {
                  flexWrap: "wrap",
                  maxHeight: iconSize * wrapRows,
                  overflow: "hidden",
                  "& > .icon ~ .icon": { marginLeft: `${-iconSize / 4}px` },
                }
              : {
                  flexDirection: "row-reverse",
                  height: iconSize,
                  "& > .icon ~ .icon": { marginRight: `${-iconSize / 4}px` },
                }),
          }}
        >
          {buffs?.map((buff: ActiveBuff) => {
            const tooltipId = `buffs-${buff?.name}-${player?.id}`;
            return (
              <Buff
                key={tooltipId}
                tooltipId={tooltipId}
                buff={buff}
                player={player}
                size={iconSize}
              />
            );
          })}
        </Flex>
      </Flex>
    );
  },
  arePropsEqualWithKeys(["player.buffs"]),
);
