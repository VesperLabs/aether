import { msToHours } from "@/rules/stats";
import { Box, Text } from "@/ui";
import { STATIC_ROW_STYLES } from "./layout";
import { RowTitle } from "./row-title";
import { useQuery } from "@tanstack/react-query";
import { fetchMetrics } from "./api";

export const Metrics = () => {
  const { data: metrics } = useQuery({
    queryKey: ["metrics"],
    queryFn: fetchMetrics,
  });

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
