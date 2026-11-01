import { memo, useEffect, useState } from "react";
import { Box, Donut } from "@/ui";
import type { Cooldown } from "@/client/hud/app/context";
import { arePropsEqualWithKeys } from "@/ui";

/** Opacity of a skill you can't afford to use, like the chat button away from anyone. */
export const DISABLED_OPACITY = 0.5;

/** The cooldown that ends last, so a button blocked by several shows one ring, not one per cooldown. */
export function getLatestCooldown(...cooldowns: (Cooldown | undefined)[]) {
  let latest: Cooldown | undefined;
  for (const cooldown of cooldowns) {
    if (!cooldown) continue;
    if (!latest || cooldown.startTime + cooldown.duration > latest.startTime + latest.duration) {
      latest = cooldown;
    }
  }
  return latest;
}

export const CooldownTimer = memo(
  ({ cooldown, color = "#FFF" }: { cooldown?: Cooldown; color?: string }) => {
    const [percentage, setPercentage] = useState(0);
    const duration = cooldown?.duration ?? 0;
    const startTime = cooldown?.startTime;

    useEffect(() => {
      const start = startTime ?? Date.now();
      const triggerTimer = () => {
        const currentTime = Date.now();
        const elapsedTime = currentTime - start;

        const percentageElapsed = elapsedTime / duration;

        setPercentage(percentageElapsed);

        if (elapsedTime >= duration) {
          setPercentage(1);
          if (interval) clearInterval(interval);
        }
      };

      const interval = setInterval(triggerTimer, 16);
      triggerTimer();

      return () => {
        clearInterval(interval);
      };
    }, [startTime, duration]);

    return (
      <Box>
        <Donut
          value={Math.abs(percentage) || 0}
          size="16"
          sx={{
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: -1,
            "& circle:first-of-type": {
              opacity: 0,
              color: "#000",
            },
            "& circle:last-of-type": {
              opacity: percentage < 1 ? 0.15 : 0,
              color,
              transition: ".3s ease opacity",
            },
          }}
        />
      </Box>
    );
  },
  arePropsEqualWithKeys(["cooldown"]),
);
