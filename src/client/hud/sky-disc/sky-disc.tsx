import { useEffect, useState } from "react";
import { SEASON_ICONS, type Season } from "@/content";
import { Box, Text, Tooltip, TooltipContent } from "@/ui";
import { SEASON_CHANGED_EVENT, currentHour, currentSeason } from "@/client/scenes/world-clock";
import { DISC_SIZE, GLASS_PILL } from "@/client/hud/app/glass-disc";
import { isDaytime, skyColorAt } from "./sky-color";
import { SeasonIconImage } from "./season-icon-image";

/** The sun moves slowly; a redraw a second keeps up. */
const REDRAW_MS = 1000;
const SKY_SIZE = DISC_SIZE - 8;
const BODY_SIZE = 17;
const BADGE_SIZE = 14;

const ICONS = "./assets/icons/sky";
const TOOLTIP_ID = "sky-disc";

const SEASON_NAMES: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

const useSeason = () => {
  const [season, setSeason] = useState(currentSeason);
  useEffect(() => {
    const onChange = (event: Event) => setSeason((event as CustomEvent<Season>).detail);
    window.addEventListener(SEASON_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(SEASON_CHANGED_EVENT, onChange);
  }, []);
  return season;
};

const useHour = () => {
  const [hour, setHour] = useState(currentHour);
  useEffect(() => {
    const timer = setInterval(() => setHour(currentHour()), REDRAW_MS);
    return () => clearInterval(timer);
  }, []);
  return hour;
};

const formatHour = (hour: number) => {
  const minutes = Math.floor(hour * 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
};

/** A little disc of sky beside the minimap: the sun or moon on the hour's color, and the season. */
export const SkyDisc = () => {
  const season = useSeason();
  const hour = useHour();
  return (
    <Box data-tooltip-id={TOOLTIP_ID} sx={{ ...GLASS_PILL, position: "relative" }}>
      <Tooltip id={TOOLTIP_ID}>
        <TooltipContent>
          <Text>{SEASON_NAMES[season]}</Text>
          <Text sx={{ fontWeight: "normal" }}>{formatHour(hour)}</Text>
        </TooltipContent>
      </Tooltip>
      <Box
        sx={{
          width: SKY_SIZE,
          height: SKY_SIZE,
          borderRadius: "50%",
          bg: skyColorAt(hour),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={`${ICONS}/${isDaytime(hour) ? "sun" : "moon"}.png`}
          alt=""
          width={BODY_SIZE}
          height={BODY_SIZE}
        />
      </Box>
      <SeasonIconImage
        icon={SEASON_ICONS[season]}
        size={BADGE_SIZE}
        style={{ position: "absolute", right: -3, bottom: -3 }}
      />
    </Box>
  );
};
