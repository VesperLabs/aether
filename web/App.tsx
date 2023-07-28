import { ThemeProvider, theme, Box, Flex, Text } from "@aether/ui";
import { Theme } from "theme-ui";
import { Link, Route } from "wouter";
import PageItems from "./PageItems";
import PageNasties from "./PageNasties";
import { useEffect, useState } from "react";
function msToHours(ms) {
  if (!ms) return 0;
  const millisecondsInHour = 60 * 60 * 1000; // Number of milliseconds in an hour
  return (ms / millisecondsInHour).toFixed(2) + " hours";
}

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
        <Text sx={{ fontSize: 6 }}>Aether Wiki</Text>
        <Flex sx={{ gap: 3 }}>
          <Link href="/items">Items</Link>
          <Link href="/monsters">Monsters</Link>
          <Metrics />
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

  useEffect(() => {
    fetch(`${process.env.SERVER_URL}/metrics`, {
      method: "GET",
    })
      .then((response) => response.json())
      .then((data) => {
        setMetrics(data);
      })
      .catch((error) => console.log(error));
  }, []);

  if (!metrics) {
    return <Text>Server: Offline</Text>;
  }

  return (
    <>
      <Box sx={{ flex: 1 }} />
      <Text>Players Online: {metrics?.playersOnline}</Text>
      <Text>Loots: {metrics?.lootsOnGround}</Text>
      <Text>Npcs: {metrics?.npcsLoaded}</Text>
      <Text>Uptime: {msToHours(metrics?.upTime)}</Text>
    </>
  );
};

export default App;
