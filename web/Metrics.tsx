import { msToHours } from "@aether/shared";
import { useState, useEffect } from "react";
import { Box, Text } from "@aether/ui";
import { STATIC_ROW_STYLES, RowTitle } from ".";

const Metrics = () => {
  const [metrics, setMetrics] = useState<ServerMetrics>();

  useEffect(() => {
    fetch(`${process.env.SERVER_URL}/metrics?timestamp=${Date.now()}`, {
      method: "GET",
    })
      .then((response) => response.json())
      .then((data) => {
        setMetrics(data);
      })
      .catch((error) => {});
  }, []);

  return (
    <RowTitle
      sx={{
        ...STATIC_ROW_STYLES,
        top: 0,
        borderWidth: "0 0 1px 0",
      }}
    >
      {metrics ? (
        <>
          <Box sx={{ flex: 1 }} />
          <Text>
            Online: {metrics?.playersOnline ?? "-"} / {metrics?.totalPlayers ?? "-"}
          </Text>
          <Text>Loots: {metrics?.lootsOnGround ?? "-"}</Text>
          <Text>Npcs: {metrics?.npcsLoaded ?? "-"}</Text>
          <Text>Uptime: {metrics?.upTime ? msToHours(metrics?.upTime) : "-"}</Text>
          <Text>Ping: {metrics?.ping ?? "-"}</Text>
        </>
      ) : (
        <>
          <Box sx={{ flex: 1 }} />
          <Text>Server: Offline</Text>
        </>
      )}
    </RowTitle>
  );
};

export default Metrics;
