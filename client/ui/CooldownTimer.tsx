import { memo, useEffect, useState } from "react";
import { Box, Donut } from "@aether/ui";
import { arePropsEqualWithKeys } from "@aether/shared";

const CooldownTimer = memo(({ cooldown, color = "#FFF" }: any) => {
  const [percentage, setPercentage] = useState(0);
  let duration = cooldown?.duration ?? 0;
  let startTime = cooldown?.startTime ?? new Date().getTime();

  useEffect(() => {
    const triggerTimer = () => {
      const currentTime = new Date().getTime();
      const elapsedTime = currentTime - startTime;

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
}, arePropsEqualWithKeys(["cooldown"]));

export default CooldownTimer;
