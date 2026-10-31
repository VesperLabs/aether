import { ThemeUIProvider, theme, Box, Flex } from "@/ui";
import { Theme } from "theme-ui";
import { Route } from "wouter";
import { Footer } from "./footer";
import { Metrics } from "./metrics";
import { Header } from "./header";
import { PageItems } from "./page-items";
import { PageKeepers } from "./page-keepers";
import { PageNasties } from "./page-nasties";
import { PagePlayers } from "./page-players";
import { MapShowcase } from "./map-showcase";
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
          {/* The game maps panning behind the home page, fixed to the whole screen. */}
          <Route path="/">
            <MapShowcase sx={{ position: "fixed", inset: 0, zIndex: 0 }} />
          </Route>
          {/* The page itself, layered above the maps, at least a screen tall so the footer sits at the
              bottom. */}
          <Flex
            sx={{ position: "relative", zIndex: 1, flexDirection: "column", minHeight: "100vh" }}
          >
            <Flex
              sx={{
                p: 4,
                gap: 2,
                flexDirection: "column",
                width: "100%",
                maxWidth: 1100,
                mx: "auto",
                boxSizing: "border-box",
              }}
            >
              <Header />
              <Metrics />
              <Box>
                <Route path="/" component={PageHome} />
                <Route path="/items" component={PageItems} />
                <Route path="/monsters" component={PageNasties} />
                <Route path="/players" component={PagePlayers} />
                <Route path="/keepers" component={PageKeepers} />
              </Box>
            </Flex>
            <Footer />
          </Flex>
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
