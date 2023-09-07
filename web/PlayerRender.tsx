import {
  PlayerRender,
  PLAYER_RENDER_CANVAS_STYLE,
  FULL_CANVAS_SIZE,
  Flex,
  Icon,
  Text,
  Box,
} from "@aether/ui";
import { CLASS_ICON_MAP } from "@aether/shared";
import { useState } from "react";

const LOADING_CANVAS_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAjlJREFUeF7tmkFug0AQBPH/H50IyRy8Bpz1DKFaqtyimElTNY3llR+LPygCD1QawywKgS2BQhQCIwCLY0MUAiMAi2NDFAIjAItjQxQCIwCLY0MUAiMAi2NDFAIjAItjQxQCIwCLY0MUAiMAi2NDFAIjAItjQxQCIwCLY0MUAiMAi2NDFAIjAItjQxQCIwCLY0MU0k7gZ2di7KLFBl+WZU/E6Cbu/uICP4n/RcYmJ+oeo8J+ISNOikLa39JqA9OEzDyqIt9PFFJb6ParFdKOtDZQITV+7VcrpB1pbaBCavzar1ZIO9LaQIXU+LVfnSZkBfDNZ5GY+4wJOqzijJSoe4wK61lW+xOyPHCmGR6dlHGfD6jIiDn1TXpkKeTijZ8Z3yEjoiUpDVHIzPpe/NpOGfiWJDREIRdv/Mz4o6/4zEhaly7mq0L0hihkZn3/4bWjkKNt/xRl7zrkMiJDHZxbbVlnHlfjm/h2Lfa+scFOVr4i5FOTbv+7Qm5X8BpAIQopE/CRVUbYO0AhvTzL0xRSRtg7QCG9PMvTFFJG2DtAIb08y9MUUkbYO0AhvTzL0xRSRtg74EjI2UlwzIlETNCDE+DxNHf9fe/IvnclLpyWKuRCJPeOVsi9/N/+u0IUAiMAi2NDFAIjAItjQxQCIwCLY0MUAiMAi2NDFAIjAItjQxQCIwCLY0MUAiMAi2NDFAIjAItjQxQCIwCLY0MUAiMAi2NDFAIjAItjQxQCIwCLY0MUAiMAi2NDYEJ+Ac+aM2UEX1usAAAAAElFTkSuQmCC";

export default function ({ player }: any) {
  const [loading, setLoading] = useState(true);
  const playerLevel = player?.stats?.level;
  const icon = CLASS_ICON_MAP?.[player?.charClass?.toUpperCase()];

  return (
    <Flex
      sx={{ flexDirection: "column", alignItems: "center", mx: -2 }}
      data-tooltip-id={player?.id}
      data-tooltip-place="bottom"
    >
      <Box
        sx={{
          height: FULL_CANVAS_SIZE,
          width: FULL_CANVAS_SIZE,
          position: "relative",
          opacity: loading ? 0.1 : 0,
          zIndex: 0,
          mb: -FULL_CANVAS_SIZE,
          transition: loading ? ".3s ease all" : "none",
        }}
      >
        <img style={PLAYER_RENDER_CANVAS_STYLE} src={LOADING_CANVAS_IMAGE} />
      </Box>
      <Box sx={{ opacity: loading ? 0 : 1, transition: ".3s ease all" }}>
        <PlayerRender
          player={player}
          shouldBuffer={false}
          onLoadComplete={(status) => setLoading(!status)}
        />
      </Box>
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
