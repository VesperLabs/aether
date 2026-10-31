import { msToHours } from "@/rules/stats";
import { Text } from "@/ui";
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
        /* A small translucent box under the menu, on the right. */
        width: "auto",
        alignSelf: "flex-end",
        gap: 3,
        px: 3,
        py: 1,
        fontSize: [0, 1],
        fontWeight: "normal",
        whiteSpace: "nowrap",
        flexWrap: "wrap",
        background: "shadow.30",
        borderRadius: 6,
        position: "relative",
        zIndex: 1,
      }}
    >
      {metrics ? (
        <>
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
          <Text>Server: Offline</Text>
        </>
      )}
    </RowTitle>
  );
};
