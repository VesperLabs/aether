import React, { useEffect, useState, createContext, useContext } from "react";
import { isMobile } from "./utils";
import { ThemeProvider, Box, theme, Badge, Flex } from "./ui";

const AppContext = createContext();

const useAppContext = () => {
  return useContext(AppContext);
};

function App({ socket, debug }) {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    socket.on("connect", () => {
      setIsConnected(true);
    });
    socket.on("disconnect", () => {
      setIsConnected(false);
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <AppContext.Provider value={{ isConnected, setIsConnected, socket, debug }}>
        <GameWrapper>
          <DebugPanel />
          <AttackPad />
        </GameWrapper>
      </AppContext.Provider>
    </ThemeProvider>
  );
}

const GameWrapper = (props) => {
  return (
    <Box
      sx={{
        left: "50%",
        transform: `translateX(-50%)`,
        width: "100%",
        maxWidth: 1120,
        position: "fixed",
        zIndex: 100,
      }}
      {...props}
    />
  );
};

const AttackPad = () => {
  return (
    <Box
      onTouchStart={(e) => {
        console.log(e);
        window.dispatchEvent(new Event("hero_attack"));
      }}
      sx={{
        borderRadius: "100%",
        bg: "shadow.15",
        position: "absolute",
        width: 100,
        height: 100,
        bottom: 50,
        right: 20,
      }}
    />
  );
};

const DebugPanel = () => {
  const { debug, isConnected } = useAppContext();
  return debug ? (
    <Box
      sx={{
        bottom: 0,
        right: 0,
        left: 0,
        position: "absolute",
        bg: "shadow.15",
        pointerEvents: "none",
      }}
    >
      <Flex p={2}>
        {isConnected ? (
          <Badge sx={{ bg: "success" }}>Connected</Badge>
        ) : (
          <Badge sx={{ bg: "danger" }}>Disconnected</Badge>
        )}
      </Flex>
    </Box>
  ) : (
    <></>
  );
};

export default App;
