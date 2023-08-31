import { memo } from "react";
import { Box, Flex, Tooltip, Icon } from "@aether/ui";
import { useAppContext, Portrait } from "./";
import { arePropsEqualWithKeys } from "@aether/shared";
import { cloneDeep } from "lodash";

const UserName = ({ sx, player }: { player: any; sx?: object }) => {
  return <Box sx={{ ...sx }}>{player?.profile?.userName}</Box>;
};

type BarProps = {
  width?: number;
  height?: number;
  color?: string;
  min: number;
  max: number;
  sx?: object;
  showText?: boolean;
};

const Bar = ({
  width = 100,
  height = 12,
  color = "red",
  showText = true,
  min,
  max,
  sx,
  ...props
}: BarProps) => {
  const percent = Math.round((min / max) * 100) + "%";
  return (
    <Box
      data-tooltip-id="hud"
      data-tooltip-place="bottom"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 3,
        bg: "shadow.25",
        border: (t) => `1px solid rgba(255,255,255,.85)`,
        boxShadow: `0px 0px 0px 1px #000`,
        width,
        height,
        ...sx,
      }}
      {...props}
    >
      <Box
        sx={{
          position: "absolute",
          width: "100%",
          height: "100%",
          lineHeight: 1,
          fontSize: 0,
          textAlign: "center",
        }}
      >
        {showText && `${min} / ${max}`}
      </Box>
      <Box sx={{ bg: color, height: "100%", width: percent, transition: ".5s ease width" }} />
    </Box>
  );
};

const Buffs = memo(({ player, sx }: any) => {
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
        {buffs?.map((buff: Buff) => {
          return (
            <Icon
              key={buff.name}
              icon={`./assets/atlas/spell/spell-${buff.name}.png`}
              size={24}
              data-tooltip-content={
                "Lv." + buff?.level + " " + buff?.name.charAt(0).toUpperCase() + buff?.name.slice(1)
              }
              data-tooltip-id="hud"
              data-tooltip-place="bottom"
            />
          );
        })}
      </Flex>
    </Flex>
  );
}, arePropsEqualWithKeys(["player.buffs"]));

const PlayerHud = memo(({ player, isBig }: any) => {
  const { stats, profile, equipment, activeItemSlots } = player ?? {};
  const isOffScreen = !player;
  const memoProps = { activeItemSlots, equipment, profile };

  return (
    <Flex
      sx={{
        gap: 1,
        position: "relative",
        filter: isOffScreen ? "grayscale(100%)" : "none",
      }}
    >
      <Memoized
        as={Portrait}
        player={player}
        filteredSlots={["boots", "pants"]}
        size={isBig ? 54 : 32}
        scale={isBig ? 1 : 0.57}
        topOffset={isBig ? 22 : 12}
        memoProps={memoProps}
      />
      <Flex sx={{ flexDirection: "column", gap: "1px", pointerEvents: "all" }}>
        <Memoized
          as={UserName}
          sx={{ fontSize: isBig ? 2 : 0 }}
          player={player}
          memoProps={memoProps}
        />
        <Bar
          data-tooltip-content={`HP: ${stats?.hp} / ${stats?.maxHp}`}
          color="red.700"
          max={stats?.maxHp}
          min={stats?.hp}
          showText={isBig}
          width={isBig ? 100 : 50}
          height={isBig ? 12 : 6}
        />
        <Bar
          data-tooltip-content={`MP: ${stats?.mp} / ${stats?.maxMp}`}
          color="blue.500"
          max={stats?.maxMp}
          min={stats?.mp}
          showText={isBig}
          width={isBig ? 100 : 50}
          height={isBig ? 12 : 6}
        />
        <Bar
          data-tooltip-content={`SP: ${stats?.sp} / ${stats?.maxSp}`}
          color="green.500"
          max={stats?.maxSp}
          min={stats?.sp}
          width={isBig ? 100 : 50}
          height={6}
          showText={false}
        />
        {isBig && (
          <Bar
            data-tooltip-content={`EXP: ${stats?.exp} / ${stats?.maxExp}`}
            color="purple.400"
            max={stats?.maxExp}
            min={stats?.exp}
            height={6}
            showText={false}
          />
        )}
        <Buffs player={player} sx={!isBig ? { transform: `scale(0.6)` } : {}} />
      </Flex>
      <Memoized
        as={LevelIcon}
        player={player}
        sx={!isBig ? { transform: `scale(0.6)` } : {}}
        memoProps={memoProps}
      />
    </Flex>
  );
}, arePropsEqualWithKeys(["player.stats", "player.profile", "player.equipment", "player.activeItemSlots", "player.buffs"]));

const LevelIcon = ({ player, sx }) => {
  return (
    <Box
      data-tooltip-place="bottom"
      data-tooltip-id="hud"
      data-tooltip-content={`Level ${player?.stats?.level} ${player?.charClass} `}
      sx={{
        textTransform: "capitalize",
        borderRadius: 6,
        minWidth: 20,
        textAlign: "center",
        lineHeight: "16px",
        fontSize: 0,
        pointerEvents: "all",
        position: "absolute",
        background: "black",
        border: `1px solid white`,
        boxShadow: `0px 0px 0px 1px black`,
        transformOrigin: "top left",
        ...sx,
      }}
    >
      {player?.stats?.level}
    </Box>
  );
};

const MenuHud = () => {
  const { hero, party, players, zoom } = useAppContext();
  const partyIds = party?.members?.map((p) => p?.id)?.filter((id) => hero?.id !== id);
  const hasParty = partyIds?.length > 0;

  return (
    <Box
      sx={{
        top: 2,
        left: 2,
        position: "absolute",
        transform: `scale(${(1.25 * parseFloat(zoom)).toFixed(1)})`,
        transformOrigin: "top left",
      }}
    >
      <Tooltip id="hud" />
      <PlayerHud player={cloneDeep(hero)} isBig={true} />
      <Flex sx={{ flexDirection: "column" }}>
        {hasParty &&
          partyIds?.map((id) => (
            <PlayerHud
              isBig={false}
              player={cloneDeep(players?.find((p) => p?.id === id))}
              key={id}
            />
          ))}
      </Flex>
    </Box>
  );
};

const Memoized = memo(
  (props: any) => {
    const { as: As = Text } = props;
    return <As {...props}></As>;
  },
  (prev, next) => {
    if (prev?.player && !next?.player) return true;
    if (JSON.stringify(prev?.memoProps) === JSON.stringify(next?.memoProps)) return true;
    return false;
  }
);

export default MenuHud;
