import { ThemeProvider, theme, Box, Flex, Text } from "@aether/ui";
import { Theme } from "theme-ui";
import { Route } from "wouter";
import { Footer, Metrics, RouterLink } from "./";
import PageItems from "./PageItems";
import PageNasties from "./PageNasties";
import PagePlayers from "./PagePlayers";
import PageHome from "./PageHome";
import { QueryClient, QueryClientProvider } from "react-query";
import { useQuery } from "react-query";
import { fetchMetrics } from "./api";
import ModalConnecting from "./ModalConnecting";
import { useEffect, useState } from "react";

const queryClient = new QueryClient();

const App = () => {
  return (
    <ThemeProvider theme={theme as Theme}>
      <QueryClientProvider client={queryClient}>
        <LoadingProvider>
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
              <RouterLink href="/players">Players</RouterLink>
              <RouterLink href="/items">Items</RouterLink>
              <RouterLink href="/keepers">Keepers</RouterLink>
              <RouterLink href="/monsters">Monsters</RouterLink>
            </Flex>
            <Box>
              <Route path="/" component={PageHome as any} />
              <Route path="/items" component={PageItems as any} />
              <Route path="/monsters" component={PageNasties as any} />
              <Route path="/players" component={PagePlayers} />
              <Route path="/keepers" component={PagePlayers} />
            </Box>
          </Flex>
          <Footer />
        </LoadingProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

const LoadingProvider = ({ children }) => {
  const [polling, setPolling] = useState(true);

  const { data: metrics } = useQuery("metrics", fetchMetrics, {
    refetchInterval: polling ? 1000 : false, // Poll every 5000ms when polling is true
    refetchIntervalInBackground: true,
    enabled: polling, // Control the activation of the query based on the polling state
  });

  useEffect(() => {
    console.log(metrics?.totalPlayers);
    if (metrics?.totalPlayers) setPolling(false); // Stop polling when ping is detected
  }, [metrics?.totalPlayers]);

  return !polling ? children : <ModalConnecting />;
};

export default App;
