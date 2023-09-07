import { msToHours } from "@aether/shared";
import { Box, Text } from "@aether/ui";
import { STATIC_ROW_STYLES, RowTitle } from ".";
import { useQuery } from "react-query";
import { fetchMetrics } from "./api";

const Metrics = () => {
  const { data: metrics, isLoading: loadingMetrics } = useQuery("metrics", fetchMetrics);

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
