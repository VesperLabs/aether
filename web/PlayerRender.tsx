import { PlayerRender, Flex, Icon, Text } from "@aether/ui";
import { CLASS_ICON_MAP } from "@aether/shared";

export default function ({ player }: any) {
  const playerLevel = player?.stats?.level;
  const icon = CLASS_ICON_MAP?.[player?.charClass?.toUpperCase()];
  return (
    <Flex
      sx={{ flexDirection: "column", alignItems: "center", mx: -2 }}
      data-tooltip-id={player?.id}
      data-tooltip-place="bottom"
    >
      <PlayerRender player={player} shouldBuffer={false} />
      <Flex sx={{ mt: -4, gap: 1, alignItems: "center", minHeight: 22 }}>
        {icon && (
          <Icon size={22} icon={icon} sx={{ transform: "scale(.75)", imageRendering: "smooth" }} />
        )}
        <Text>{player?.profile?.userName}</Text>
        {playerLevel && <Text sx={{ opacity: 0.5 }}>(Lv. {playerLevel})</Text>}
      </Flex>
    </Flex>
  );
}
