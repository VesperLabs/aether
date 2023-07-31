import { Box, Icon, Tooltip, Flex, Text, Divider } from "@aether/ui";
import { useAppContext } from ".";
import { useEffect, useState } from "react";
import { msToHours } from "@aether/shared";

const STATUS_TOOLTIP_ID = "STATUS_TOOLTIP_ID";

const TextDivider = ({ children, sx }: any) => (
  <>
    <Divider sx={{ pt: 0, zIndex: -1 }} />
    <Text sx={{ mt: -3, pb: 2, mb: -1, color: "gray.500", ...sx }}>{children}</Text>
  </>
);

const StatusToolTip = ({ show }) => {
  const [metrics, setMetrics] = useState<ServerMetrics>();
  const [isLoading, setLoading] = useState<Boolean>(true);
  const { isConnected } = useAppContext();

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
        <Text>Ping: {metrics?.ping}</Text>
      </Flex>
    </Tooltip>
  );
};

const StatusIcon = () => {
  const [show, setShow] = useState(false);
  const { isConnected } = useAppContext();
  return (
    <Box
      data-tooltip-id={STATUS_TOOLTIP_ID}
      sx={{ pointerEvents: "all" }}
      onMouseEnter={() => {
        setShow(true);
      }}
      onMouseLeave={() => setShow(false)}
    >
      <StatusToolTip show={show} />
      {isConnected ? (
        <Icon icon="./assets/icons/success.png" sx={{ opacity: 0.5 }} />
      ) : (
        <Icon icon="./assets/icons/danger.png" sx={{ opacity: 0.5 }} />
      )}
    </Box>
  );
};

export default StatusIcon;
