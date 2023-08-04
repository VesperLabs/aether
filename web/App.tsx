import { ThemeProvider, theme, Box, Flex, Text, Icon } from "@aether/ui";
import { Theme } from "theme-ui";
import { Link, Route, useLocation } from "wouter";
import PageItems from "./PageItems";
import PageNasties from "./PageNasties";
import { useEffect, useState } from "react";
import RowTitle from "./RowTitle";
import { msToHours } from "@aether/shared";
import PagePlayers from "./PagePlayers";
import PageHome from "./PageHome";

const RouterLink = ({ href, children }) => {
  const [page] = useLocation();
  const isActive = href === page;
  return (
    //@ts-ignore
    <Flex as={Link} href={href} sx={{ color: isActive ? "set" : "magic" }}>
      {children}
    </Flex>
  );
};

const App = () => {
  return (
    <ThemeProvider theme={theme as Theme}>
      <Flex
        sx={{
          p: 4,
          gap: 2,
          flexDirection: "column",
        }}
      >
        <Metrics />
        <Text sx={{ fontSize: 6, mt: 2 }}>Aether Wiki</Text>
        <Flex sx={{ gap: 3 }}>
          <RouterLink href="/">Home</RouterLink>
          <RouterLink href="/items">Items</RouterLink>
          <RouterLink href="/monsters">Monsters</RouterLink>
          <RouterLink href="/players">Players</RouterLink>
        </Flex>
        <Box>
          <Route path="/" component={PageHome as any} />
          <Route path="/items" component={PageItems as any} />
          <Route path="/monsters" component={PageNasties as any} />
          <Route path="/players" component={PagePlayers as any} />
        </Box>
      </Flex>
    </ThemeProvider>
  );
};

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
        gap: 3,
        position: "absolute",
        top: 0,
        left: 0,
        borderRadius: 0,
        fontSize: [0, 1, 1],
        fontWeight: "normal",
        borderBottom: `1px solid rgba(255,255,200,.25)`,
        whiteSpace: "nowrap",
      }}
    >
      {metrics ? (
        <>
          <Box sx={{ flex: 1 }} />
          <Text>Players: {metrics?.playersOnline ?? "-"}</Text>
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

export default App;
