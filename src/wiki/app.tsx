import { ThemeUIProvider, theme, Box, Flex } from "@/ui";
import { Theme } from "theme-ui";
import { Route } from "wouter";
import { Footer } from "@/wiki/frame/footer";
import { Metrics } from "@/wiki/frame/metrics";
import { Header } from "@/wiki/frame/header";
import { TabBar } from "@/wiki/frame/tab-bar";
import { TAB_HEIGHT } from "@/wiki/frame/menu-bar";
import { PageItems } from "@/wiki/items/page-items";
import { PageKeepers } from "@/wiki/mobs/page-keepers";
import { PageNasties } from "@/wiki/mobs/page-nasties";
import { PagePlayers } from "@/wiki/players/page-players";
import { MapShowcase } from "@/wiki/home/map-showcase";
import { PageHome } from "@/wiki/home/page-home";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { fetchMetrics } from "@/wiki/api/fetchers";
import { ModalConnecting } from "@/wiki/frame/modal-connecting";
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
              bottom. `dvh` is the screen left after mobile browser toolbars; `vh` would hide the
              footer behind them. */}
          <Flex
            sx={{
              position: "relative",
              zIndex: 1,
              flexDirection: "column",
              minHeight: "100dvh",
              /* On phones, room at the bottom for the fixed tab bar. */
              pb: [TAB_HEIGHT, 0],
              boxSizing: "border-box",
            }}
          >
            <Flex
              sx={{
                py: 4,
                /* Narrower sides on phones, so pages get more of the screen. */
                px: [3, 4],
                gap: 2,
                flexDirection: "column",
                width: "100%",
                maxWidth: 1100,
                mx: "auto",
                boxSizing: "border-box",
              }}
            >
              <Metrics />
              <Header />
              <Box>
                <Route path="/" component={PageHome} />
                <Route path="/items" component={PageItems} />
                <Route path="/monsters" component={PageNasties} />
                <Route path="/players" component={PagePlayers} />
                <Route path="/keepers" component={PageKeepers} />
              </Box>
            </Flex>
            <Footer />
            <TabBar />
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
