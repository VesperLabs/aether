import { memo, useEffect, useState } from "react";
import { Box, Donut, Text } from "@/ui";
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

    const remaining = Math.max(0, duration * (1 - percentage));

    return (
      <Box>
        {percentage < 1 && remaining > 0 && (
          <Text
            sx={{
              position: "absolute",
              top: "50%",
              left: 0,
              width: "100%",
              transform: "translateY(-50%)",
              textAlign: "center",
              fontSize: 1,
              color,
              textShadow: "1px 1px 0 #000",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            {/* Tenths under 10s, so a short throw cooldown still counts down */}
            {remaining < 10000 ? (remaining / 1000).toFixed(1) : Math.ceil(remaining / 1000)}
          </Text>
        )}
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
              opacity: percentage < 1 ? 0.35 : 0,
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
