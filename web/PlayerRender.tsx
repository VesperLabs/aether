import { PlayerRender, Flex, Icon, Text } from "@aether/ui";
import { CLASS_ICON_MAP } from "@aether/shared";

export default function ({ player }) {
  return (
    <Flex
      sx={{ flexDirection: "column", alignItems: "center", mx: -2 }}
      data-tooltip-id={player?.id}
      data-tooltip-place="bottom"
    >
      <PlayerRender player={player} shouldBuffer={false} />
      <Flex sx={{ mt: -4, gap: 1, alignItems: "center" }}>
        <Icon
          size={22}
          icon={CLASS_ICON_MAP?.[player?.charClass?.toUpperCase()]}
          sx={{ transform: "scale(.75)", imageRendering: "smooth" }}
        />
        <Text>{player?.profile?.userName}</Text>
        <Text sx={{ opacity: 0.5 }}>(Lv. {player?.stats?.level})</Text>
      </Flex>
    </Flex>
  );
}
