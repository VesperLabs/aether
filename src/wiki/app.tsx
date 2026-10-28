import { ThemeUIProvider, theme, Box, Flex, Text } from "@/ui";
import { Theme } from "theme-ui";
import { Route } from "wouter";
import { Footer } from "./footer";
import { Metrics } from "./metrics";
import { RouterLink } from "./layout";
import { PageItems } from "./page-items";
import { PageNasties } from "./page-nasties";
import { PagePlayers } from "./page-players";
import { PageHome } from "./page-home";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { fetchMetrics } from "./api";
import { ModalConnecting } from "./modal-connecting";
import { useState, type ReactNode } from "react";

const queryClient = new QueryClient();

/** Wiki "Give'r a sec" is for Fly cold start; skip on local dev / localhost so the UI loads immediately. */
function shouldSkipWarmupModal(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

export const App = () => {
  return (
    <ThemeUIProvider theme={theme as Theme}>
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
              <Route path="/" component={PageHome} />
              <Route path="/items" component={PageItems} />
              <Route path="/monsters" component={PageNasties} />
              <Route path="/players" component={PagePlayers} />
              <Route path="/keepers" component={PagePlayers} />
            </Box>
          </Flex>
          <Footer />
        </LoadingProvider>
      </QueryClientProvider>
    </ThemeUIProvider>
  );
};

const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [warmup] = useState(() => !shouldSkipWarmupModal());

  /* Don't gate on metrics.ping: it's serverTime - client query timestamp and can be huge with
   * clock skew or slow links, which left the modal up forever. Cold-start: keep polling until
   * the first successful response; if the server is down, show the wiki with "Offline" metrics. */
  const { isSuccess, isError } = useQuery({
    queryKey: ["metrics"],
    queryFn: fetchMetrics,
    refetchInterval: (query) => (query.state.status === "pending" ? 1000 : false),
    refetchIntervalInBackground: true,
    enabled: warmup,
  });
  const polling = warmup && !isSuccess && !isError;

  return !polling ? children : <ModalConnecting />;
};
