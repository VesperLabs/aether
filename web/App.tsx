import { ThemeProvider, theme, Box, Flex, Text } from "@aether/ui";
import { Theme } from "theme-ui";
import { Link, Route } from "wouter";
import PageItems from "./PageItems";
import PageNasties from "./PageNasties";
import { useEffect, useState } from "react";
import RowTitle from "./RowTitle";
import { msToHours } from "@aether/shared";

const App = () => {
  return (
    <ThemeProvider theme={theme as Theme}>
      <Flex
        sx={{
          p: 4,
          gap: 2,
          flexDirection: "column",
          //transform: ["none", "none", "none", "scale(2)"],
          //transformOrigin: "0 0",
          //width: ["auto", "auto", "auto", "48vw"],
        }}
      >
        <Metrics />
        <Text sx={{ fontSize: 6, mt: 2 }}>Aether Wiki</Text>
        <Flex sx={{ gap: 3 }}>
          <Link href="/items">Items</Link>
          <Link href="/monsters">Monsters</Link>
        </Flex>
        <Box>
          <Route path="/items" component={PageItems as any} />
          <Route path="/monsters" component={PageNasties as any} />
        </Box>
      </Flex>
    </ThemeProvider>
  );
};

const Metrics = () => {
  const [metrics, setMetrics] = useState<ServerMetrics>();
  const [isLoading, setLoading] = useState<Boolean>(true);

  useEffect(() => {
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
  }, []);

  if (isLoading) {
    return <></>;
  }

  return (
    <RowTitle
      sx={{
        gap: 3,
        position: "absolute",
        top: 0,
        left: 0,
        borderRadius: 0,
        fontSize: 1,
        fontWeight: "normal",
        borderBottom: `1px solid rgba(255,255,200,.25)`,
      }}
    >
      {metrics ? (
        <>
          <Box sx={{ flex: 1 }} />
          <Text>Players: {metrics?.playersOnline}</Text>
          <Text>Loots: {metrics?.lootsOnGround}</Text>
          <Text>Npcs: {metrics?.npcsLoaded}</Text>
          <Text>Uptime: {msToHours(metrics?.upTime)}</Text>
          <Text>Ping: {metrics?.ping}</Text>
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

export default App;
