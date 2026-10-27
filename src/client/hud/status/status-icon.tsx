import { Box, Icon, Flex, Text, TextDivider } from "@/ui";
import { useAppContext } from "@/client/hud/app/context";
import { useEffect, useState } from "react";
import { isMobile } from "@/ui";
import { msToHours } from "@/rules/stats";
import { Tooltip } from "@/ui";

const STATUS_TOOLTIP_ID = "STATUS_TOOLTIP_ID";

const StatusToolTip = ({ show }: { show: boolean }) => {
  const [metrics, setMetrics] = useState<ServerMetrics>();
  const [socketPing, setSocketPing] = useState<number>();
  const [isLoading, setLoading] = useState<boolean>(true);
  const { isConnected, socket } = useAppContext();

  useEffect(() => {
    if (!show) return;
    fetch(`${process.env.SERVER_URL}/metrics?timestamp=${Date.now()}`, {
      method: "GET",
    })
      .then((response) => response.json())
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
      });
  }, [show]);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    let smoothed: number | undefined;

    const measure = () => {
      if (!socket.connected) return;
      const t0 = performance.now();
      socket.emit("latency", () => {
        if (cancelled) return;
        const ms = Math.round(performance.now() - t0);
        smoothed = smoothed === undefined ? ms : Math.round(smoothed * 0.65 + ms * 0.35);
        setSocketPing(smoothed);
      });
    };

    measure();
    const intervalId = window.setInterval(measure, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [show, socket]);

  if (isLoading) {
    return <></>;
  }

  return (
    <Tooltip id={STATUS_TOOLTIP_ID} isOpen={show}>
      <Flex
        sx={{
          fontWeight: "normal",
          whiteSpace: "nowrap",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          textTransform: "capitalize",
        }}
      >
        <TextDivider sx={{ color: isConnected ? "set" : "danger" }}>
          {isConnected ? "Connected" : "Disconnected"}
        </TextDivider>
        <Text>Players: {metrics?.playersOnline}</Text>
        <Text>Loots: {metrics?.lootsOnGround}</Text>
        <Text>Npcs: {metrics?.npcsLoaded}</Text>
        <Text>Uptime: {msToHours(metrics?.upTime)}</Text>
        <Text>Ping: {socketPing}</Text>
      </Flex>
    </Tooltip>
  );
};

export const StatusIcon = () => {
  const [hovering, setHovering] = useState(false);

  const handleMouseEnter = () => {
    setHovering(true);
  };

  const handleMouseLeave = () => {
    setHovering(false);
  };

  const outerMouseBinds = isMobile
    ? {
        onTouchStart: handleMouseEnter,
        onTouchEnd: handleMouseLeave,
      }
    : {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      };
  const { isConnected } = useAppContext();
  return (
    <Box
      sx={{
        pointerEvents: "all",
        top: 34,
        left: "-6px",
        position: "absolute",
      }}
    >
      <StatusToolTip show={hovering} />
      <Box
        data-tooltip-id={STATUS_TOOLTIP_ID}
        {...outerMouseBinds}
        sx={{ transform: "scale(.75)" }}
      >
        {isConnected ? (
          <Icon size={24} icon="./assets/icons/success.png" />
        ) : (
          <Icon size={24} icon="./assets/icons/danger.png" />
        )}
      </Box>
    </Box>
  );
};
