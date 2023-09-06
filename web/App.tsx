import { ThemeProvider, theme, Box, Flex, Text } from "@aether/ui";
import { Theme } from "theme-ui";
import { Route } from "wouter";
import { Footer, Metrics, RouterLink } from "./";
import PageItems from "./PageItems";
import PageNasties from "./PageNasties";
import PagePlayers from "./PagePlayers";
import PageHome from "./PageHome";

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
          <RouterLink href="/players">Players</RouterLink>
          <RouterLink href="/items">Items</RouterLink>
          <RouterLink href="/keepers">Keepers</RouterLink>
          <RouterLink href="/monsters">Monsters</RouterLink>
        </Flex>
        <Box>
          <Route path="/" component={PageHome as any} />
          <Route path="/items" component={PageItems as any} />
          <Route path="/monsters" component={PageNasties as any} />
          <Route path="/players" component={PagePlayers as any} />
          <Route path="/keepers" component={PagePlayers as any} />
        </Box>
      </Flex>
      <Footer />
    </ThemeProvider>
  );
};

export default App;
