import { memo, useEffect, useState } from "react";
import { Box, Donut } from "@/ui";
import type { Cooldown } from "@/client/hud/app/context";
import { arePropsEqualWithKeys } from "@/ui";

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
