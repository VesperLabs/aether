import { Box, Icon, Flex, Text, Divider } from "@aether/ui";
import { useAppContext } from ".";
import { useEffect, useState } from "react";
import { isMobile, msToHours } from "@aether/shared";
import Tooltip from "./Tooltip";

const STATUS_TOOLTIP_ID = "STATUS_TOOLTIP_ID";

const TextDivider = ({ children, sx }: any) => (
  <>
    <Divider sx={{ pt: 0, zIndex: -1 }} />
    <Text sx={{ mt: -3, pb: 2, mb: -1, color: "gray.500", ...sx }}>{children}</Text>
  </>
);

const StatusToolTip = ({ show }) => {
  const [metrics, setMetrics] = useState<ServerMetrics>();
  const [socketPing, setSocketPing] = useState<number>();
  const [isLoading, setLoading] = useState<Boolean>(true);
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

const StatusIcon = (props) => {
  const [hovering, setHovering] = useState(false);

  const handleMouseEnter = (e) => {
    setHovering(true);
  };

  const handleMouseLeave = (e) => {
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
        {...props}
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

export default StatusIcon;
