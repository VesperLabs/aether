import { ThemeProvider, theme, Box, Flex } from "@aether/ui";
import { Theme } from "theme-ui";
import { Link, Route } from "wouter";
import PageItems from "./PageItems";

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
        <Box>
          <Link href="/items">
            <a className="link">Items</a>
          </Link>
        </Box>
        <Box>
          <Route path="/items" component={PageItems as any} />
        </Box>
      </Flex>
    </ThemeProvider>
  );
};

export default App;
