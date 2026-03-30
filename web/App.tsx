import { ThemeProvider, theme, Box, Flex, Text } from "@aether/ui";
import { Theme } from "theme-ui";
import { Route } from "wouter";
import { Footer, Metrics, RouterLink } from "./";
import PageItems from "./PageItems";
import PageNasties from "./PageNasties";
import PagePlayers from "./PagePlayers";
import PageHome from "./PageHome";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { fetchMetrics } from "./api";
import ModalConnecting from "./ModalConnecting";
import { useEffect, useState } from "react";

const queryClient = new QueryClient();

/** Wiki "Give'r a sec" is for Fly cold start; skip on local dev / localhost so the UI loads immediately. */
function shouldSkipWarmupModal(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

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
  const [polling, setPolling] = useState(() => !shouldSkipWarmupModal());

  const { isSuccess, isError } = useQuery({
    queryKey: ["metrics"],
    queryFn: fetchMetrics,
    refetchInterval: polling ? 1000 : false,
    refetchIntervalInBackground: true,
    enabled: polling,
  });

  useEffect(() => {
    /* Don't gate on metrics.ping: it's serverTime - client query timestamp and can be huge with
     * clock skew or slow links, which left the modal up forever. Cold-start: keep polling until
     * the first successful response; if the server is down, show the wiki with "Offline" metrics. */
    if (isSuccess || isError) {
      setPolling(false);
    }
  }, [isSuccess, isError]);

  return !polling ? children : <ModalConnecting />;
};

export default App;
