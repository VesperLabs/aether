import { useEffect, useState } from "react";
import { useAppContext } from ".";
import { Box, Donut } from "@aether/ui";

const CooldownTimer = ({ cooldown, color = "#FFF" }) => {
  const { cooldowns } = useAppContext();
  const [percentage, setPercentage] = useState(0);
  let duration = cooldowns[cooldown]?.duration ?? 0;
  let startTime = cooldowns[cooldown]?.startTime ?? Date.now();

  useEffect(() => {
    const triggerTimer = () => {
      const currentTime = Date.now();
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
};

export default CooldownTimer;
