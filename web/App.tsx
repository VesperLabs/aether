import { ThemeProvider, theme, Box, Flex } from "@aether/ui";
import { Theme } from "theme-ui";
import { Link, Route } from "wouter";
import PageItems from "./PageItems";
import PageNasties from "./PageNasties";

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

export default App;
