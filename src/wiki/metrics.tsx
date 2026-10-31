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
        /* Up through the page's top padding (32px) to the top edge of the screen. On phones a
           square strip across the whole width, through the page's 16px side padding; wider, a
           small translucent tab on the right, as if peeking in. */
        width: "auto",
        alignSelf: ["stretch", "flex-end"],
        mx: ["-16px", 0],
        justifyContent: ["center", "flex-start"],
        mt: "-32px",
        gap: 3,
        px: 3,
        py: 1,
        fontSize: [0, 1],
        fontWeight: "normal",
        whiteSpace: "nowrap",
        flexWrap: "wrap",
        background: "shadow.30",
        borderRadius: [0, "0 0 6px 6px"],
        borderBottom: ["1px solid rgba(255, 255, 200, .25)", "none"],
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
